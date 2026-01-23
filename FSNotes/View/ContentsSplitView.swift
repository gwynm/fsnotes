//
//  ContentsSplitView.swift
//  FSNotes
//
//  Created for Contents Panel feature
//

import Cocoa

class ContentsSplitView: NSSplitView, NSSplitViewDelegate {
    
    public var shouldHideDivider = false
    
    override func draw(_ dirtyRect: NSRect) {
        self.delegate = self
        super.draw(dirtyRect)
    }
    
    override var dividerColor: NSColor {
        return NSColor(named: "divider")!
    }
    
    override var dividerThickness: CGFloat {
        get {
            return shouldHideDivider ? 0 : 1
        }
    }
    
    func splitViewDidResizeSubviews(_ notification: Notification) {
        ViewController.shared()?.viewDidResize()
    }
    
    func splitViewWillResizeSubviews(_ notification: Notification) {
        if let vc = ViewController.shared() {
            vc.editor.updateTextContainerInset()
        }
    }
    
    // Minimum width for contents panel
    func splitView(_ splitView: NSSplitView, constrainMinCoordinate proposedMinimumPosition: CGFloat, ofSubviewAt dividerIndex: Int) -> CGFloat {
        // Minimum width for editor area
        return 200
    }
    
    // Maximum position (minimum contents panel width when visible)
    func splitView(_ splitView: NSSplitView, constrainMaxCoordinate proposedMaximumPosition: CGFloat, ofSubviewAt dividerIndex: Int) -> CGFloat {
        // Leave at least 100 for contents panel
        return splitView.frame.width - 100
    }
}
