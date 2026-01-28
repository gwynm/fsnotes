//
//  ProjectSettingsViewController.swift
//  FSNotes
//
//  Created by Oleksandr Glushchenko on 11/23/18.
//  Copyright © 2018 Oleksandr Glushchenko. All rights reserved.
//

import Cocoa
import Carbon.HIToolbox

class ProjectSettingsViewController: SettingsViewController {

    @IBOutlet weak var modificationDate: NSButton!
    @IBOutlet weak var creationDate: NSButton!
    @IBOutlet weak var titleButton: NSButton!
    @IBOutlet weak var sortByGlobal: NSButton!
    @IBOutlet weak var directionASC: NSButton!
    @IBOutlet weak var directionDESC: NSButton!
    @IBOutlet weak var showInAll: NSButton!
    @IBOutlet weak var firstLineAsTitle: NSButton!
    @IBOutlet weak var nestedFoldersContent: NSButton!
    @IBOutlet weak var gitView: NSView!
    @IBOutlet weak var gitViewHeight: NSLayoutConstraint!
    @IBOutlet weak var mainProjectMessage: NSTextField!
    @IBOutlet weak var gitRepositoryTitle: NSTextField!
    @IBOutlet weak var panelHeading: NSTextField!
    
    override func viewDidLoad() {
        gitView.isHidden = true
        gitViewHeight.constant = 0
        mainProjectMessage?.isHidden = true
    }
    
    private func hideGitControls(_ hidden: Bool) {
        // Hide/show all the git controls from the parent class
        origin?.isHidden = hidden
        keyStatus?.isHidden = hidden
        logTextField?.isHidden = hidden
        removeButton?.isHidden = hidden
        cloneButton?.isHidden = hidden
        passphrase?.isHidden = hidden
        progressIndicator?.isHidden = hidden
        
        // Also hide the labels in gitView
        for subview in gitView.subviews {
            if subview != mainProjectMessage {
                subview.isHidden = hidden
            }
        }
    }
    
    @IBAction func sortBy(_ sender: NSButton) {
        guard let project = project else { return }
        
        let sortBy = SortBy(rawValue: sender.identifier!.rawValue)!
        project.settings.sortBy = sortBy
        project.saveSettings()
        
        guard let vc = ViewController.shared() else { return }

        vc.buildSearchQuery()
        vc.updateTable()
    }
    
    @IBAction func sortDirection(_ sender: NSButton) {
        guard let project = project else { return }
        
        project.settings.sortDirection = SortDirection(rawValue: sender.identifier!.rawValue)!
        project.saveSettings()
        
        guard let vc = ViewController.shared() else { return }

        vc.buildSearchQuery()
        vc.updateTable()
    }
    
    
    @IBAction func showNotesInMainList(_ sender: NSButton) {
        project?.settings.showInCommon = sender.state == .on
        project?.saveSettings()
    }
    
    @IBAction func firstLineAsTitle(_ sender: NSButton) {
        guard let project = self.project else { return }
        
        project.settings.firstLineAsTitle = sender.state == .on
        project.saveSettings()
        
        let notes = Storage.shared().getNotesBy(project: project)
        for note in notes {
            note.invalidateCache()
        }
        
        guard let vc = ViewController.shared() else { return }
        vc.notesTableView.reloadData()
    }
    
    @IBAction func close(_ sender: Any) {
        self.dismiss(nil)
    }
    
    @IBAction func showNestedFoldersContent(_ sender: NSButton) {
        guard let project = self.project else { return }
        
        project.settings.showNestedFoldersContent = sender.state == .on
        project.saveSettings()
        
        guard let vc = ViewController.shared() else { return }
        vc.updateTable()
    }

    public func load(project: Project) {
        self.project = project
        
        // Set panel heading
        let isMainProject = project.isDefault || project.isVirtual
        if isMainProject {
            panelHeading?.stringValue = NSLocalizedString("Options for Main Project", comment: "")
        } else {
            panelHeading?.stringValue = String(format: NSLocalizedString("Options for %@", comment: ""), project.label)
        }
        
        if project.isVirtual {
            showInAll.isEnabled = false
            nestedFoldersContent.isEnabled = false
            firstLineAsTitle.isEnabled = false
        }

        showInAll.state = project.settings.showInCommon ? .on : .off
        firstLineAsTitle.state = project.settings.isFirstLineAsTitle() ? .on : .off
        nestedFoldersContent.state = project.settings.showNestedFoldersContent ? .on : .off

        modificationDate.state = project.settings.sortBy == .modificationDate ? .on : .off
        creationDate.state = project.settings.sortBy == .creationDate ? .on : .off
        titleButton.state = project.settings.sortBy == .title ? .on : .off
        sortByGlobal.state = project.settings.sortBy == .none ? .on : .off

        directionASC.state = project.settings.sortDirection == .asc ? .on : .off
        directionDESC.state = project.settings.sortDirection == .desc ? .on : .off

        if project.parent == nil && !project.isTrash && !project.isEncrypted {
            // Check if this is the main/default project
            let isMainProject = project.isDefault || project.isVirtual
            
            if isMainProject {
                // For main project, check if git is configured
                let hasGitConfigured = project.settings.gitOrigin != nil && !project.settings.gitOrigin!.isEmpty
                
                if hasGitConfigured {
                    // Show message to go to Settings
                    gitView.isHidden = false
                    gitViewHeight.constant = 50
                    hideGitControls(true)
                    mainProjectMessage?.isHidden = false
                    mainProjectMessage?.stringValue = NSLocalizedString("Main project; go to FSNotes → Settings → Git to configure.", comment: "")
                } else {
                    // No git configured for main project - hide entirely
                    gitView.isHidden = true
                    gitViewHeight.constant = 0
                }
            } else {
                // Bookmark project - show full git controls
                gitView.isHidden = false
                gitViewHeight.constant = 150
                hideGitControls(false)
                mainProjectMessage?.isHidden = true
                gitRepositoryTitle?.stringValue = "Git repository for \(project.label)"
                loadGit(project: project)
            }
        } else {
            loadGit(project: project)
        }
    }

    override func keyDown(with event: NSEvent) {
        if event.keyCode == kVK_Return || event.keyCode == kVK_Escape {
            self.dismiss(nil)
        }
    }
}
