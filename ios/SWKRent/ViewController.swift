import UIKit
import WebKit
import LocalAuthentication

final class ViewController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate {
    private var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 11/255, green: 15/255, blue: 23/255, alpha: 1.0)

        let config = WKWebViewConfiguration()
        config.userContentController.add(self, name: "SwkIosBridge")
        config.preferences.javaScriptEnabled = true

        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.navigationDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = view.backgroundColor
        view.addSubview(webView)

        if let indexURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "public") {
            webView.loadFileURL(indexURL, allowingReadAccessTo: indexURL.deletingLastPathComponent())
        } else if let fallbackURL = URL(string: "https://swk.rent/?platform=ios") {
            webView.load(URLRequest(url: fallbackURL))
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let action = body["action"] as? String else { return }

        switch action {
        case "setIconVariant":
            let variant = (body["variant"] as? String) ?? "emblem"
            let iconName: String? = (variant == "wordmark") ? "AppIconWordmark" : nil
            if UIApplication.shared.supportsAlternateIcons {
                UIApplication.shared.setAlternateIconName(iconName, completionHandler: nil)
            }
        case "biometricUnlock":
            let context = LAContext()
            var error: NSError?
            if context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) {
                let reason = (body["reason"] as? String) ?? "Verify UAE PASS & Biometric Identity"
                context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, _ in
                    DispatchQueue.main.async {
                        self.webView.evaluateJavaScript(
                            "window.dispatchEvent(new CustomEvent('swk:biometric-result',{detail:{verified:\(success),method:'iOS FaceID/TouchID'}}));",
                            completionHandler: nil
                        )
                    }
                }
            }
        default:
            break
        }
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url, let scheme = url.scheme?.lowercased() else {
            decisionHandler(.allow)
            return
        }
        if ["tel", "mailto", "sms", "whatsapp"].contains(scheme) || url.host == "wa.me" {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }
}
