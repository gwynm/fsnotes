//
//  AboutViewController.swift
//  FSNotes
//
//  Created by Олександр Глущенко on 5/10/19.
//  Copyright © 2019 Oleksandr Glushchenko. All rights reserved.
//

import Cocoa

class AboutViewController: NSViewController, NSTableViewDataSource, NSTableViewDelegate {
    
    @IBOutlet weak var translatorsList: NSTableView!
    
    private var languages = [
        "Deutsch 🇩🇪",
        "Ukrainian🇺🇦",
        "Spanish 🇪🇸",
        "Arabic 🇮🇶",
        "Chinese 🇨🇳",
        "Korean 🇰🇷",
        "French 🇫🇷",
        "Dutch 🇳🇱",
        "Portuguese 🇵🇹",
        "Italian 🇮🇹",
        "Hebrew 🇮🇱",
        "Chinese 🇨🇳",
        "Portuguese 🇵🇹",
        "Czech 🇨🇿",
        "Hindi 🇮🇳",
        "Turkish 🇹🇷",
        "Chinese 🇹🇼🇭🇰🇲🇴"
    ]
    
    private var authors = [
        "Michael Barzmann",
        "Olena Hlushchenko ♥️",
        "aonez (aone@keka.io)",
        "Ayad (@ayad0net)",
        "Pertim (macwk.com@gmail.com)",
        "Wonsup Yoon (pusnow@kaist.ac.kr)",
        "Simon Jornet (github.com/jornetsimon)",
        "Chris Hendriks (github.com/olikilo)",
        "reddit.com/user/endallbeallknowitall",
        "Leonardo Bartoletti - leodmc88@gmail.com",
        "Will Pazner (github.com/pazner)",
        "Holton Jiang (github.com/holton-jiang)",
        "Vanessa C. (github.com/VChristinne)",
        "Max Akrman (github.com/isametry)",
        "Aagman (stscpns@gmail.com)",
        "Bünyamin Erol (bunyaminerol.com.tr)",
        "Wen Xiang (imwwx@icloud.com)"
    ]
    
    override func viewDidLoad() {
        let dictionary = Bundle.main.infoDictionary
        let ver = dictionary?["CFBundleShortVersionString"] as? String ?? "?"
        let build = dictionary?["CFBundleVersion"] as? String ?? "?"
        versionLabel.stringValue = "Version \(ver) (\(build))\n(Gwyn's fork)"
        versionLabel.isSelectable = true
        
        translatorsList.delegate = self
        translatorsList.dataSource = self
    }

    @IBOutlet weak var versionLabel: NSTextField!
    
    @IBAction func openContributorsPage(_ sender: Any) {
        let url = URL(string: "https://github.com/glushchenko/fsnotes/graphs/contributors")!
        NSWorkspace.shared.open(url)
    }
    
    func numberOfRows(in tableView: NSTableView) -> Int {
        return languages.count
    }
        
    func tableView(_ tableView: NSTableView, viewFor tableColumn: NSTableColumn?, row: Int) -> NSView? {
        let result  = tableView.makeView(withIdentifier: (tableColumn?.identifier)!, owner: self) as! NSTableCellView
        if  tableColumn?.identifier.rawValue == "table.about.0" {
            result.textField?.stringValue = languages[row]
        } else {
            result.textField?.stringValue = authors[row]
        }
        return result
    }
}
