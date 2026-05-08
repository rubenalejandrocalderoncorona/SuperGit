import Cocoa
import WebKit
import Foundation

// Ports
let API_PORT  = 8765
let WEB_PORT  = 3000

// Paths (resolved relative to this binary's location inside the .app bundle)
let bundleMacOS = Bundle.main.executableURL!.deletingLastPathComponent()
let bundleRoot  = bundleMacOS.deletingLastPathComponent()  // Contents/

let serverBin   = bundleMacOS.appendingPathComponent("supergit-server")
let webDir      = bundleRoot.appendingPathComponent("Resources/web")
let nodeBin     = bundleMacOS.appendingPathComponent("node")

var serverProcess: Process?
var webProcess: Process?

func startProcess(_ bin: URL, args: [String] = [], env: [String: String] = [:], cwd: URL? = nil) -> Process {
    let p = Process()
    p.executableURL = bin
    p.arguments = args
    var fullEnv = ProcessInfo.processInfo.environment
    for (k, v) in env { fullEnv[k] = v }
    p.environment = fullEnv
    if let cwd { p.currentDirectoryURL = cwd }
    try? p.run()
    return p
}

func waitForPort(_ port: Int, maxAttempts: Int = 40, completion: @escaping () -> Void) {
    DispatchQueue.global().async {
        for _ in 0..<maxAttempts {
            if let url = URL(string: "http://localhost:\(port)"),
               let _ = try? Data(contentsOf: url) {
                DispatchQueue.main.async { completion() }
                return
            }
            Thread.sleep(forTimeInterval: 0.5)
        }
        // Timed out — try anyway
        DispatchQueue.main.async { completion() }
    }
}

// ── AppDelegate ─────────────────────────────────────────────────────────────

class WindowDelegate: NSObject, NSWindowDelegate {
    func windowWillClose(_ notification: Notification) {
        serverProcess?.terminate()
        webProcess?.terminate()
        NSApplication.shared.terminate(nil)
    }
}

class AppDelegate: NSObject, NSApplicationDelegate {
    var window: NSWindow!
    var webView: WKWebView!
    var winDelegate = WindowDelegate()

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Start Go API server
        if FileManager.default.fileExists(atPath: serverBin.path) {
            serverProcess = startProcess(serverBin)
        }

        // Start Next.js production server if node binary is bundled
        if FileManager.default.fileExists(atPath: nodeBin.path) {
            webProcess = startProcess(
                nodeBin,
                args: ["server.js"],
                env: ["PORT": "\(WEB_PORT)", "HOSTNAME": "127.0.0.1"],
                cwd: webDir
            )
        }

        // Build the window
        let config = WKWebViewConfiguration()
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")
        webView = WKWebView(frame: .zero, configuration: config)

        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1280, height: 820),
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        window.title = "SuperGit"
        window.contentView = webView
        window.center()
        window.makeKeyAndOrderFront(nil)
        window.delegate = winDelegate

        // Wait for the web server, then load
        waitForPort(WEB_PORT) {
            let url = URL(string: "http://localhost:\(WEB_PORT)")!
            self.webView.load(URLRequest(url: url))
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.activate(ignoringOtherApps: true)
app.run()
