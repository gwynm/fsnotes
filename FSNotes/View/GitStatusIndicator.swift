//
//  GitStatusIndicator.swift
//  FSNotes
//
//  Created by FSNotes on 26.01.2026.
//  Copyright © 2026 Oleksandr Hlushchenko. All rights reserved.
//

import Cocoa

/// Represents the current Git sync status for the main project
enum GitSyncState {
    case synced           // Green: pulled within 5 min, no uncommitted changes
    case stale            // Yellow: pulled > 5 min ago, no uncommitted changes
    case uncommitted      // Orange: has uncommitted changes
    case error            // Red: last operation failed or pull > 1 hour old
    case inProgress       // Blue: operation currently running
    case notConfigured    // Hidden: git not set up
    
    var color: NSColor {
        switch self {
        case .synced:       return .systemGreen
        case .stale:        return .systemYellow
        case .uncommitted:  return .systemOrange
        case .error:        return .systemRed
        case .inProgress:   return .systemBlue
        case .notConfigured: return .clear
        }
    }
    
    var description: String {
        switch self {
        case .synced:       return "Synced"
        case .stale:        return "Sync recommended"
        case .uncommitted:  return "Uncommitted changes"
        case .error:        return "Sync error"
        case .inProgress:   return "Syncing..."
        case .notConfigured: return "Git not configured"
        }
    }
}

class GitStatusIndicator: NSView {
    
    // MARK: - State tracking
    
    /// Last successful pull time for the main project
    static var lastPullTime: Date?
    
    /// Last Git error message (nil if last operation succeeded)
    static var lastError: String?
    
    /// Whether a Git operation is currently in progress
    static var isOperationInProgress: Bool = false
    
    // MARK: - UI
    
    private let imageView: NSImageView = {
        let iv = NSImageView()
        iv.translatesAutoresizingMaskIntoConstraints = false
        iv.imageScaling = .scaleProportionallyUpOrDown
        return iv
    }()
    
    private var updateTimer: Timer?
    
    // MARK: - Initialization
    
    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        setupView()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupView()
    }
    
    private func setupView() {
        addSubview(imageView)
        
        NSLayoutConstraint.activate([
            imageView.leadingAnchor.constraint(equalTo: leadingAnchor),
            imageView.trailingAnchor.constraint(equalTo: trailingAnchor),
            imageView.topAnchor.constraint(equalTo: topAnchor),
            imageView.bottomAnchor.constraint(equalTo: bottomAnchor)
        ])
        
        // Load the template image
        if let image = NSImage(named: "git_status") {
            image.isTemplate = true
            imageView.image = image
        }
        
        // Start update timer (every 10 seconds to keep tooltip fresh)
        updateTimer = Timer.scheduledTimer(withTimeInterval: 10, repeats: true) { [weak self] _ in
            self?.updateState()
        }
        
        updateState()
    }
    
    deinit {
        updateTimer?.invalidate()
    }
    
    // MARK: - State calculation
    
    func updateState() {
        let state = calculateState()
        
        // Hide if not configured
        if state == .notConfigured {
            isHidden = true
            return
        }
        
        isHidden = false
        
        // Apply tint color
        imageView.contentTintColor = state.color
        
        // Update tooltip
        toolTip = buildTooltip(state: state)
    }
    
    private func calculateState() -> GitSyncState {
        // Check if main project has Git configured
        guard let defaultProject = Storage.shared().getDefault(),
              let gitProject = defaultProject.getGitProject(),
              gitProject.getGitOrigin() != nil else {
            return .notConfigured
        }
        
        // Check if operation is in progress
        if GitStatusIndicator.isOperationInProgress || ViewController.gitQueueBusy {
            return .inProgress
        }
        
        // Check for error
        if let _ = GitStatusIndicator.lastError {
            return .error
        }
        
        // Refresh git state to detect uncommitted changes
        let isClean: Bool
        do {
            isClean = try gitProject.checkGitState()
        } catch {
            // If we can't check state, assume clean to avoid false positives
            isClean = true
        }
        
        // Check last pull time
        if let lastPull = GitStatusIndicator.lastPullTime {
            let elapsed = Date().timeIntervalSince(lastPull)
            
            // More than 1 hour - error state
            if elapsed > 3600 {
                return .error
            }
            
            // Check for uncommitted changes
            if !isClean {
                return .uncommitted
            }
            
            // More than 5 minutes - stale
            if elapsed > 300 {
                return .stale
            }
            
            // All good
            return .synced
        }
        
        // No pull yet - check for uncommitted changes
        if !isClean {
            return .uncommitted
        }
        
        // No pull recorded yet, but no error and no uncommitted changes
        // Treat as stale (needs initial sync)
        return .stale
    }
    
    private func buildTooltip(state: GitSyncState) -> String {
        var parts: [String] = [state.description]
        
        if let lastPull = GitStatusIndicator.lastPullTime {
            let formatter = DateFormatter()
            formatter.dateFormat = "d MMM yy HH:mm"
            parts.append("Last sync: \(formatter.string(from: lastPull))")
        } else {
            parts.append("Never synced")
        }
        
        if let error = GitStatusIndicator.lastError {
            parts.append("Error: \(error)")
        }
        
        return parts.joined(separator: "\n")
    }
    
    // MARK: - Static helpers for updating state from Git operations
    
    static func recordPullSuccess() {
        lastPullTime = Date()
        lastError = nil
        isOperationInProgress = false
        notifyUpdate()
    }
    
    static func recordError(_ message: String) {
        lastError = message
        isOperationInProgress = false
        notifyUpdate()
    }
    
    static func recordOperationStarted() {
        isOperationInProgress = true
        notifyUpdate()
    }
    
    static func recordOperationEnded() {
        isOperationInProgress = false
        notifyUpdate()
    }
    
    private static func notifyUpdate() {
        DispatchQueue.main.async {
            NotificationCenter.default.post(name: .gitStatusChanged, object: nil)
        }
    }
}

extension Notification.Name {
    static let gitStatusChanged = Notification.Name("gitStatusChanged")
}
