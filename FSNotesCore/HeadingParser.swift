//
//  HeadingParser.swift
//  FSNotes
//
//  Created for Contents Panel feature
//

import Foundation

/// Represents a single heading in a markdown document
public class Heading {
    public let level: Int           // 1-6 for # through ######
    public let text: String         // Heading text without # prefix
    public let range: NSRange       // Location in document for scrolling
    public var children: [Heading]  // Child headings (e.g., H2s under H1)
    
    public init(level: Int, text: String, range: NSRange) {
        self.level = level
        self.text = text
        self.range = range
        self.children = []
    }
}

/// Parses markdown content to extract headings in a hierarchical structure
public class HeadingParser {
    
    // ATX-style header pattern: # Header, ## Header, etc.
    // Matches 1-6 # characters followed by space and heading text
    private static let headingPattern = "^(#{1,6})\\s+(.+?)\\s*$"
    
    /// Parse markdown content and return a flat list of headings
    /// - Parameter content: The markdown text to parse
    /// - Returns: Array of Heading objects in document order
    public static func parseFlat(content: String) -> [Heading] {
        var headings: [Heading] = []
        
        guard let regex = try? NSRegularExpression(pattern: headingPattern, options: [.anchorsMatchLines]) else {
            return headings
        }
        
        let nsContent = content as NSString
        let fullRange = NSRange(location: 0, length: nsContent.length)
        
        regex.enumerateMatches(in: content, options: [], range: fullRange) { result, _, _ in
            guard let result = result,
                  result.numberOfRanges >= 3 else { return }
            
            let hashRange = result.range(at: 1)
            let textRange = result.range(at: 2)
            
            guard hashRange.location != NSNotFound,
                  textRange.location != NSNotFound else { return }
            
            let level = hashRange.length
            let text = nsContent.substring(with: textRange)
            let lineRange = result.range(at: 0)
            
            let heading = Heading(level: level, text: text, range: lineRange)
            headings.append(heading)
        }
        
        return headings
    }
    
    /// Parse markdown content and return headings in a tree structure
    /// H2s become children of the preceding H1, H3s children of H2, etc.
    /// - Parameter content: The markdown text to parse
    /// - Returns: Array of top-level Heading objects with nested children
    public static func parse(content: String) -> [Heading] {
        let flatHeadings = parseFlat(content: content)
        return buildTree(from: flatHeadings)
    }
    
    /// Build a tree structure from a flat list of headings
    private static func buildTree(from headings: [Heading]) -> [Heading] {
        var roots: [Heading] = []
        var stack: [Heading] = []
        
        for heading in headings {
            // Pop items from stack until we find a parent (lower level number)
            while let last = stack.last, last.level >= heading.level {
                stack.removeLast()
            }
            
            if let parent = stack.last {
                parent.children.append(heading)
            } else {
                roots.append(heading)
            }
            
            stack.append(heading)
        }
        
        return roots
    }
}
