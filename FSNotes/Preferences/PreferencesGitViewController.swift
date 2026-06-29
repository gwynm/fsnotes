//
//  PreferencesGitViewController.swift
//  FSNotes
//
//  Created by Олександр Глущенко on 9/8/19.
//  Copyright © 2019 Oleksandr Glushchenko. All rights reserved.
//

import Cocoa

class PreferencesGitViewController: SettingsViewController {

    // Git data storage location
    @IBOutlet weak var repositoriesPath: NSPathControl!
    @IBOutlet weak var storagePathContainer: NSView!
    @IBOutlet weak var storageCentral: NSButton!
    @IBOutlet weak var storageSeparate: NSButton!
    @IBOutlet weak var changeStorageButton: NSButton!
    @IBOutlet weak var showInFinderButton: NSButton!
    @IBOutlet weak var showInTerminalButton: NSButton!
    
    // Commit messages
    @IBOutlet weak var commitMessageAsk: NSButton!
    @IBOutlet weak var commitMessageDefault: NSButton!
    
    // Timing
    @IBOutlet weak var snapshotsTextField: NSTextField!
    @IBOutlet weak var minutes: NSTextField!
    @IBOutlet weak var backupManually: NSButton!
    @IBOutlet weak var backupBySchedule: NSButton!
    @IBOutlet weak var pullInterval: NSTextField!
    
    // Timing labels (for enable/disable)
    @IBOutlet weak var commitPushLabel: NSTextField!
    @IBOutlet weak var pullEveryLabel: NSTextField!
    @IBOutlet weak var hourAtLabel: NSTextField!
    @IBOutlet weak var minutesLabel: NSTextField!
    @IBOutlet weak var secondsLabel: NSTextField!
    
    // Legacy outlets (kept for compatibility during transition)
    @IBOutlet weak var separateDotGit: NSButton!
    @IBOutlet weak var askCommitMessage: NSButton!

    override func viewWillAppear() {
        super.viewWillAppear()
        preferredContentSize = NSSize(width: 550, height: 680)

        loadGit(project: Storage.shared().getDefault()!)

        repositoriesPath.url = UserDefaultsManagement.gitStorage
        snapshotsTextField.stringValue = String(UserDefaultsManagement.snapshotsInterval)
        minutes.stringValue = String(UserDefaultsManagement.snapshotsIntervalMinutes)
        backupManually.state = UserDefaultsManagement.backupManually ? .on : .off
        backupBySchedule.state = UserDefaultsManagement.backupManually ? .off : .on
        pullInterval.stringValue = String(UserDefaultsManagement.pullInterval)
        
        // Storage location radio buttons
        let useSeparate = UserDefaultsManagement.separateRepo
        storageCentral?.state = useSeparate ? .off : .on
        storageSeparate?.state = useSeparate ? .on : .off
        separateDotGit?.state = useSeparate ? .on : .off
        updateStoragePathVisibility()
        
        // Commit message radio buttons
        let askMessage = UserDefaultsManagement.askCommitMessage
        commitMessageAsk?.state = askMessage ? .on : .off
        commitMessageDefault?.state = askMessage ? .off : .on
        askCommitMessage?.state = askMessage ? .on : .off
        
        // Update timing controls enabled state
        updateTimingControlsEnabled()
    }
    
    private func updateStoragePathVisibility() {
        let showPath = storageCentral?.state == .on
        storagePathContainer?.isHidden = !showPath
        repositoriesPath?.isHidden = !showPath
        changeStorageButton?.isHidden = !showPath
        showInFinderButton?.isHidden = !showPath
        showInTerminalButton?.isHidden = !showPath
    }
    
    private func updateTimingControlsEnabled() {
        let isAutomatic = backupBySchedule?.state == .on
        
        // Enable/disable text fields
        snapshotsTextField?.isEnabled = isAutomatic
        minutes?.isEnabled = isAutomatic
        pullInterval?.isEnabled = isAutomatic
        
        // Update label colors
        let textColor = isAutomatic ? NSColor.labelColor : NSColor.disabledControlTextColor
        commitPushLabel?.textColor = textColor
        pullEveryLabel?.textColor = textColor
        hourAtLabel?.textColor = textColor
        minutesLabel?.textColor = textColor
        secondsLabel?.textColor = textColor
    }

    @IBAction func changeGitStorage(_ sender: NSButton) {
        let openPanel = NSOpenPanel()
        openPanel.directoryURL = UserDefaultsManagement.gitStorage
        openPanel.allowsMultipleSelection = false
        openPanel.canChooseDirectories = true
        openPanel.canCreateDirectories = true
        openPanel.canChooseFiles = false
        openPanel.begin { (result) -> Void in
            if result == .OK {
                guard let url = openPanel.url?.standardized,
                    url != UserDefaultsManagement.storageUrl else {
                        let alert = NSAlert()
                        alert.alertStyle = .critical
                        alert.informativeText = NSLocalizedString("Path not available", comment: "")
                        alert.messageText = NSLocalizedString("Default storage path should not be equal to Git path.", comment: "")
                        alert.runModal()
                        return
                }

                let bookmarksManager = SandboxBookmark.sharedInstance()
                
                if let currentURL = UserDefaultsManagement.gitStorage {
                    bookmarksManager.remove(url: currentURL)
                }
                
                bookmarksManager.store(url: url)
                bookmarksManager.save()

                UserDefaultsManagement.gitStorage = url
                self.repositoriesPath.url = url
            }
        }
    }

    @IBAction func showFinder(_ sender: Any) {
        guard let storage = UserDefaultsManagement.gitStorage else { return }
        
        NSWorkspace.shared.activateFileViewerSelecting([storage])
    }

    @IBAction func showTerminal(_ sender: Any) {
        guard let storage = UserDefaultsManagement.gitStorage else { return }
        
        NSWorkspace.shared.openFile(storage.path, withApplication: "Terminal.app")
    }

    @IBAction func backupMethod(_ sender: NSButton) {
        guard let ident = sender.identifier?.rawValue else { return }
        
        let isManualBackup = ident == "manual"
        
        UserDefaultsManagement.backupManually = isManualBackup
        backupManually.state = isManualBackup ? .on : .off
        backupBySchedule.state = isManualBackup ? .off : .on
        
        // Update timing controls enabled state
        updateTimingControlsEnabled()
        
        guard let vc = ViewController.shared() else { return }
        if backupBySchedule.state == .on {
            vc.schedulePull()
        } else {
            vc.stopPull()
        }
    }

    @IBAction func changeSnapshotIntervalByHours(_ sender: NSTextField) {
        if sender.stringValue == "0" || sender.stringValue.trim() == "" {
            sender.stringValue = "1"
        }
        
        if let interval = Int(sender.stringValue) {
            UserDefaultsManagement.snapshotsInterval = interval
        }

        guard let vc = ViewController.shared() else { return }
        vc.scheduleSnapshots()
    }

    @IBAction func changeSnapshotsIntervalByMinutes(_ sender: NSTextField) {
        if let interval = Int(sender.stringValue) {
            UserDefaultsManagement.snapshotsIntervalMinutes = interval
        }

        guard let vc = ViewController.shared() else { return }
        vc.scheduleSnapshots()
    }

    @IBAction func pullInterval(_ sender: NSTextField) {
        if var interval = Int(sender.stringValue) {
            if interval < 10 {
                interval = 10
                pullInterval.stringValue = String(10)
            }
            
            UserDefaultsManagement.pullInterval = interval
        }

        guard let vc = ViewController.shared() else { return }
        vc.schedulePull()
    }
    
    @IBAction func separateRepo(_ sender: NSButton) {
        UserDefaultsManagement.separateRepo = sender.state == .on
    }
    
    @IBAction func askCommitMessage(_ sender: NSButton) {
        UserDefaultsManagement.askCommitMessage = sender.state == .on
    }
    
    // MARK: - Storage Location
    
    @IBAction func storageLocationChanged(_ sender: NSButton) {
        guard let identifier = sender.identifier?.rawValue else { return }
        
        let useSeparate = identifier == "storageSeparate"
        UserDefaultsManagement.separateRepo = useSeparate
        
        storageCentral?.state = useSeparate ? .off : .on
        storageSeparate?.state = useSeparate ? .on : .off
        separateDotGit?.state = useSeparate ? .on : .off
        
        updateStoragePathVisibility()
    }
    
    @IBAction func showICloudWarning(_ sender: Any) {
        let alert = NSAlert()
        alert.messageText = NSLocalizedString("iCloud Warning", comment: "")
        alert.informativeText = NSLocalizedString("Don't select this if any of your Projects are stored in iCloud. iCloud's sync causes corruption when used on folders containing .git folders. Instead, select 'Central location' and ensure that location is not in iCloud.", comment: "")
        alert.alertStyle = .warning
        alert.addButton(withTitle: NSLocalizedString("OK", comment: ""))
        alert.runModal()
    }
    
    // MARK: - Commit Messages
    
    @IBAction func commitMessageOptionChanged(_ sender: NSButton) {
        guard let identifier = sender.identifier?.rawValue else { return }
        
        let askForMessage = identifier == "commitMessageAsk"
        UserDefaultsManagement.askCommitMessage = askForMessage
        
        commitMessageAsk?.state = askForMessage ? .on : .off
        commitMessageDefault?.state = askForMessage ? .off : .on
        askCommitMessage?.state = askForMessage ? .on : .off
    }
}
