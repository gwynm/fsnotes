//
//  ContentsOutlineView.swift
//  FSNotes
//
//  Created for Contents Panel feature
//

import Cocoa

class ContentsOutlineView: NSOutlineView, NSOutlineViewDelegate, NSOutlineViewDataSource {
    
    public var headings: [Heading] = []
    public weak var viewDelegate: ViewController?
    
    private let indentPerLevel: CGFloat = 16
    
    // MARK: - Setup
    
    override func draw(_ dirtyRect: NSRect) {
        delegate = self
        dataSource = self
        allowsTypeSelect = false
        super.draw(dirtyRect)
    }
    
    /// Reload the outline view with new headings
    public func reload(headings: [Heading]) {
        self.headings = headings
        reloadData()
        expandItem(nil, expandChildren: true)
    }
    
    /// Clear all headings
    public func clear() {
        self.headings = []
        reloadData()
    }
    
    // MARK: - NSOutlineViewDataSource
    
    func outlineView(_ outlineView: NSOutlineView, numberOfChildrenOfItem item: Any?) -> Int {
        if item == nil {
            return headings.count
        }
        if let heading = item as? Heading {
            return heading.children.count
        }
        return 0
    }
    
    func outlineView(_ outlineView: NSOutlineView, child index: Int, ofItem item: Any?) -> Any {
        if item == nil {
            return headings[index]
        }
        if let heading = item as? Heading {
            return heading.children[index]
        }
        return Heading(level: 1, text: "", range: NSRange())
    }
    
    func outlineView(_ outlineView: NSOutlineView, isItemExpandable item: Any) -> Bool {
        if let heading = item as? Heading {
            return !heading.children.isEmpty
        }
        return false
    }
    
    // MARK: - NSOutlineViewDelegate
    
    func outlineView(_ outlineView: NSOutlineView, viewFor tableColumn: NSTableColumn?, item: Any) -> NSView? {
        guard let heading = item as? Heading else { return nil }
        
        let identifier = NSUserInterfaceItemIdentifier("ContentsCell")
        var cellView = outlineView.makeView(withIdentifier: identifier, owner: self) as? NSTableCellView
        
        if cellView == nil {
            cellView = NSTableCellView()
            cellView?.identifier = identifier
            
            let textField = NSTextField()
            textField.isBordered = false
            textField.isEditable = false
            textField.isSelectable = false
            textField.drawsBackground = false
            textField.lineBreakMode = .byTruncatingTail
            textField.cell?.truncatesLastVisibleLine = true
            textField.translatesAutoresizingMaskIntoConstraints = false
            
            cellView?.addSubview(textField)
            cellView?.textField = textField
            
            NSLayoutConstraint.activate([
                textField.leadingAnchor.constraint(equalTo: cellView!.leadingAnchor, constant: 4),
                textField.trailingAnchor.constraint(equalTo: cellView!.trailingAnchor, constant: -4),
                textField.centerYAnchor.constraint(equalTo: cellView!.centerYAnchor)
            ])
        }
        
        cellView?.textField?.stringValue = heading.text
        cellView?.textField?.font = fontForLevel(heading.level)
        cellView?.textField?.textColor = NSColor.labelColor
        cellView?.toolTip = heading.text
        
        return cellView
    }
    
    func outlineView(_ outlineView: NSOutlineView, heightOfRowByItem item: Any) -> CGFloat {
        return 22
    }
    
    func outlineView(_ outlineView: NSOutlineView, shouldSelectItem item: Any) -> Bool {
        return true
    }
    
    func outlineViewSelectionDidChange(_ notification: Notification) {
        guard selectedRow >= 0,
              let heading = item(atRow: selectedRow) as? Heading,
              let vc = viewDelegate else { return }
        
        vc.scrollToHeading(heading)
    }
    
    // MARK: - Helpers
    
    private func fontForLevel(_ level: Int) -> NSFont {
        let baseSize: CGFloat = 13
        switch level {
        case 1:
            return NSFont.boldSystemFont(ofSize: baseSize)
        case 2:
            return NSFont.systemFont(ofSize: baseSize, weight: .semibold)
        default:
            return NSFont.systemFont(ofSize: baseSize)
        }
    }
    
    // MARK: - Keyboard Navigation
    
    override func keyDown(with event: NSEvent) {
        // Enter key scrolls to heading
        if event.keyCode == 36 { // kVK_Return
            if selectedRow >= 0,
               let heading = item(atRow: selectedRow) as? Heading,
               let vc = viewDelegate {
                vc.scrollToHeading(heading)
            }
            return
        }
        
        // Left arrow - focus editor
        if event.keyCode == 123 { // kVK_LeftArrow
            if let vc = viewDelegate {
                vc.focusEditArea()
            }
            return
        }
        
        super.keyDown(with: event)
    }
}
