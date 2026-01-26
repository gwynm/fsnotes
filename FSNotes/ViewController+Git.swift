//
//  ViewController+Git.swift
//  FSNotes
//
//  Created by Олександр Глущенко on 9/10/19.
//  Copyright © 2019 Oleksandr Glushchenko. All rights reserved.
//

import Cocoa
import Git
import Cgit2

extension EditorViewController {

    @IBAction func saveRevision(_ sender: NSMenuItem) {
        guard let gitProject = getGitProject() else {
            let alert = NSAlert()
            alert.alertStyle = .critical
            alert.informativeText = NSLocalizedString("Please init git repository before (Preferences -> Git -> Init/commit)", comment: "")
            alert.messageText = NSLocalizedString("Repository not found", comment: "")
            alert.runModal()
            return
        }

        guard let window = self.view.window else { return }
        if UserDefaultsManagement.askCommitMessage {
            let field = NSTextField(frame: NSRect(x: 0, y: 0, width: 290, height: 60))
            if let lastMessage = UserDefaultsManagement.lastCommitMessage {
                field.stringValue = lastMessage
            }
            
            let alert = NSAlert()
            alert.messageText = NSLocalizedString("Commit message:", comment: "")
            alert.accessoryView = field
            alert.alertStyle = .informational
            alert.addButton(withTitle: NSLocalizedString("OK", comment: ""))
            alert.addButton(withTitle: NSLocalizedString("Cancel", comment: ""))
            alert.beginSheetModal(for: window) { (returnCode: NSApplication.ModalResponse) -> Void in
                if returnCode == NSApplication.ModalResponse.alertFirstButtonReturn {
                    let commitMessage: String? = field.stringValue.count > 0 ? field.stringValue : nil
                    
                    if field.stringValue.count > 0 {
                        UserDefaultsManagement.lastCommitMessage = commitMessage
                    }
                    
                    self.saveRevision(project: gitProject, commitMessage: commitMessage)
                }
            }
            
            field.becomeFirstResponder()
            return
        }
        
        saveRevision(project: gitProject, commitMessage: nil)
    }
    
    private func saveRevision(project: Project, commitMessage: String? = nil) {
        guard let window = self.view.window else { return }
        
        // Check if this is the main project
        let isMainProject = (project == Storage.shared().getDefault()?.getGitProject())
        
        if isMainProject {
            GitStatusIndicator.recordOperationStarted()
        }

        ViewController.gitQueue.addOperation({
            ViewController.gitQueueOperationDate = Date()

            defer {
                ViewController.gitQueueOperationDate = nil
            }

            do {
                try project.saveRevision(commitMessage: commitMessage)
                
                // Update status for main project
                if isMainProject {
                    _ = try project.checkGitState()
                    GitStatusIndicator.recordPullSuccess()
                }
            } catch GitError.noAddedFiles {
                // pass - not an error, just nothing to commit
                if isMainProject {
                    GitStatusIndicator.recordOperationEnded()
                }
            } catch {
                var message = String()
                if let error = error as? GitError {
                    message = error.associatedValue()
                } else {
                    message = error.localizedDescription
                }
                
                if isMainProject {
                    GitStatusIndicator.recordError(message)
                }

                DispatchQueue.main.async {
                    let alert = NSAlert()
                    alert.alertStyle = .critical
                    alert.informativeText = message
                    alert.messageText = NSLocalizedString("Git error", comment: "")
                    alert.beginSheetModal(for: window) { (returnCode: NSApplication.ModalResponse) -> Void in }
                }
            }
        })
    }

    @IBAction func checkoutRevision(_ sender: NSMenuItem) {
        guard let vc = ViewController.shared() else { return }
        guard let commit = sender.representedObject as? Commit else { return }
        guard let note = vcEditor?.note else { return }

        if vc.prevCommit == nil {
            saveRevision(project: note.project, commitMessage: "Auto save on history checkout")
        }

        vc.prevCommit = commit
        
        note.checkout(commit: commit)

        _ = note.reload()
        NotesTextProcessor.highlight(attributedString: note.content)

        reloadAllOpenedWindows(note: note)
        
        ViewController.shared()?.notesTableView.reloadRow(note: note)

        vcEditor?.scanTagsAndAutoRename()
    }

    @IBAction private func makeFullSnapshot(_ sender: Any) {
        let cal = Calendar.current
        let hour = cal.component(.hour, from: Date())
        let minute = cal.component(.minute, from: Date())

        if let lastSnapshot = self.lastSnapshot {
            if minute == lastSnapshot {
                return
            } else {
                self.lastSnapshot = nil
            }
        }

        guard UserDefaultsManagement.snapshotsInterval != 0 && (
            hour == UserDefaultsManagement.snapshotsInterval || (
                hour != 0 && hour % UserDefaultsManagement.snapshotsInterval == 0
            )
        ) else { return }

        guard UserDefaultsManagement.snapshotsIntervalMinutes == minute else { return }
        
        lastSnapshot = minute
        
        GitStatusIndicator.recordOperationStarted()

        ViewController.gitQueue.addOperation({
            ViewController.gitQueueOperationDate = Date()

            defer {
                ViewController.gitQueueOperationDate = nil
            }

            let storage = Storage.shared()
            guard let projects = storage.getGitProjects() else {
                GitStatusIndicator.recordOperationEnded()
                return
            }
            
            // Track whether main project succeeded
            let defaultProject = storage.getDefault()
            var mainProjectSucceeded = false
            var mainProjectError: String?

            for project in projects {
                do {
                    if project.hasRepository()  {
                        try project.commit()
                        try project.pull()
                        try project.push()
                        
                        // Track main project status
                        if project == defaultProject?.getGitProject() {
                            _ = try project.checkGitState()
                            mainProjectSucceeded = true
                        }
                    }
                } catch {
                    print(error)
                    // Track main project errors
                    if project == defaultProject?.getGitProject() {
                        if let gitError = error as? GitError {
                            mainProjectError = gitError.associatedValue()
                        } else {
                            mainProjectError = error.localizedDescription
                        }
                    }
                }
            }
            
            // Update status indicator for main project
            if let error = mainProjectError {
                GitStatusIndicator.recordError(error)
            } else if mainProjectSucceeded {
                GitStatusIndicator.recordPullSuccess()
            } else {
                GitStatusIndicator.recordOperationEnded()
            }
        })
    }
    
    @IBAction private func pull(_ sender: Any) {

        // Restart queue if operation stucked more then 2 minutes
        if let date = ViewController.gitQueueOperationDate {
            let diff = Int(Date().timeIntervalSince1970) - Int(date.timeIntervalSince1970)
            let isBusy = ViewController.gitQueueBusy

            if diff > 120 && !isBusy {

                ViewController.gitQueue = OperationQueue()
                ViewController.gitQueue.maxConcurrentOperationCount = 1

                print("Git queue restart")
            } else {
                print("Git pull skipped")
                return
            }
        }

        GitStatusIndicator.recordOperationStarted()
        
        ViewController.gitQueue.addOperation({
            ViewController.gitQueueOperationDate = Date()

            defer {
                ViewController.gitQueueOperationDate = nil
            }

            // Pull for main project and track status
            if let defaultProject = Storage.shared().getDefault(),
               let gitProject = defaultProject.getGitProject(),
               gitProject.getGitOrigin() != nil {
                do {
                    try gitProject.pull()
                    _ = try gitProject.checkGitState()
                    GitStatusIndicator.recordPullSuccess()
                } catch {
                    if let gitError = error as? GitError {
                        GitStatusIndicator.recordError(gitError.associatedValue())
                    } else {
                        GitStatusIndicator.recordError(error.localizedDescription)
                    }
                }
            }
            
            // Also pull other projects (but don't track their status)
            Storage.shared().pullAll()
        })
    }

    public func scheduleSnapshots() {
        guard !UserDefaultsManagement.backupManually else { return }

        DispatchQueue.main.async {
            self.snapshotsTimer.invalidate()
            self.snapshotsTimer = Timer.scheduledTimer(timeInterval: 5, target: self, selector: #selector(self.makeFullSnapshot), userInfo: nil, repeats: true)
        }
    }
    
    public func schedulePull() {
        guard !UserDefaultsManagement.backupManually else { return }

        let interval = UserDefaultsManagement.pullInterval
        
        pullTimer.invalidate()
        pullTimer = Timer.scheduledTimer(timeInterval: TimeInterval(interval), target: self, selector: #selector(pull), userInfo: nil, repeats: true)
    }
    
    public func stopPull() {
        pullTimer.invalidate()
    }
    
    public func getGitProject() -> Project? {
        guard let vc = ViewController.shared() else { return nil }
        
        if let project = vc.getSelectedNote()?.project.getGitProject() {
            return project
        }

        if let project = vc.sidebarOutlineView.getSelectedProject()?.getGitProject() {
            return project
        }

        return Storage.shared().getDefault()?.getGitProject()
    }

}
