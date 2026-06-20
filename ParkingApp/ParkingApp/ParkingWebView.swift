import SwiftUI
import WebKit

struct ParkingWebView: UIViewRepresentable {
    let complex: Complex
    let person: Person
    let vehicle: Vehicle

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.userContentController.add(context.coordinator, name: "pageLoaded")
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        let urlString = complex.register2ParkURL.isEmpty
            ? "https://www.register2park.com/"
            : complex.register2ParkURL
        if let url = URL(string: urlString) {
            webView.load(URLRequest(url: url))
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(complex: complex, person: person, vehicle: vehicle)
    }

    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        let complex: Complex
        let person: Person
        let vehicle: Vehicle

        init(complex: Complex, person: Person, vehicle: Vehicle) {
            self.complex = complex
            self.person = person
            self.vehicle = vehicle
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            webView.evaluateJavaScript(fillFormScript()) { _, _ in }
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {}

        private func fillFormScript() -> String {
            let firstName = person.name.components(separatedBy: " ").first ?? person.name
            let lastName = person.name.components(separatedBy: " ").dropFirst().joined(separator: " ")

            return """
            (function() {
              function setVal(el, value) {
                if (!el) return;
                var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')
                  || Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value');
                if (nativeInputValueSetter) {
                  nativeInputValueSetter.set.call(el, value);
                  el.dispatchEvent(new Event('input', { bubbles: true }));
                  el.dispatchEvent(new Event('change', { bubbles: true }));
                } else {
                  el.value = value;
                  el.dispatchEvent(new Event('change', { bubbles: true }));
                }
              }

              function fillByLabel(labelText, value) {
                var labels = document.querySelectorAll('label');
                for (var l of labels) {
                  if (l.textContent.toLowerCase().includes(labelText.toLowerCase())) {
                    var input = document.getElementById(l.htmlFor)
                      || l.querySelector('input,select,textarea')
                      || l.nextElementSibling;
                    if (input) { setVal(input, value); return true; }
                  }
                }
                return false;
              }

              function fillByName(name, value) {
                var el = document.querySelector('[name="' + name + '"]')
                  || document.querySelector('[id*="' + name + '" i]')
                  || document.querySelector('[placeholder*="' + name + '" i]');
                if (el) { setVal(el, value); return true; }
                return false;
              }

              var data = {
                firstName: \(jsonString(firstName)),
                lastName: \(jsonString(lastName)),
                fullName: \(jsonString(person.name)),
                email: \(jsonString(person.email)),
                phone: \(jsonString(person.phone)),
                apt: \(jsonString(person.apartmentNumber)),
                unit: \(jsonString(person.apartmentNumber)),
                make: \(jsonString(vehicle.make)),
                model: \(jsonString(vehicle.model)),
                year: \(jsonString(vehicle.year)),
                color: \(jsonString(vehicle.color)),
                plate: \(jsonString(vehicle.licensePlate)),
                state: \(jsonString(vehicle.state)),
                property: \(jsonString(complex.propertyCode))
              };

              fillByName('first_name', data.firstName);
              fillByName('last_name', data.lastName);
              fillByName('firstName', data.firstName);
              fillByName('lastName', data.lastName);
              fillByName('name', data.fullName);
              fillByName('email', data.email);
              fillByName('phone', data.phone);
              fillByName('apartment', data.apt);
              fillByName('unit', data.unit);
              fillByName('apt', data.apt);
              fillByName('make', data.make);
              fillByName('model', data.model);
              fillByName('year', data.year);
              fillByName('color', data.color);
              fillByName('plate', data.plate);
              fillByName('license', data.plate);
              fillByName('license_plate', data.plate);
              fillByName('state', data.state);
              fillByName('property', data.property);
              fillByName('property_code', data.property);

              fillByLabel('first name', data.firstName);
              fillByLabel('last name', data.lastName);
              fillByLabel('name', data.fullName);
              fillByLabel('email', data.email);
              fillByLabel('phone', data.phone);
              fillByLabel('apartment', data.apt);
              fillByLabel('unit', data.apt);
              fillByLabel('make', data.make);
              fillByLabel('model', data.model);
              fillByLabel('year', data.year);
              fillByLabel('color', data.color);
              fillByLabel('plate', data.plate);
              fillByLabel('license', data.plate);
              fillByLabel('state', data.state);
            })();
            """
        }

        private func jsonString(_ value: String) -> String {
            let escaped = value
                .replacingOccurrences(of: "\\", with: "\\\\")
                .replacingOccurrences(of: "\"", with: "\\\"")
                .replacingOccurrences(of: "\n", with: "\\n")
            return "\"\(escaped)\""
        }
    }
}

struct ParkingWebViewScreen: View {
    let complex: Complex
    let person: Person
    let vehicle: Vehicle
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            ParkingWebView(complex: complex, person: person, vehicle: vehicle)
                .ignoresSafeArea(edges: .bottom)
                .navigationTitle("Register Parking")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .navigationBarLeading) {
                        Button("Done") { dismiss() }
                    }
                }
        }
    }
}
