import SwiftUI

struct ComplexesView: View {
    @EnvironmentObject var store: DataStore
    @State private var editingComplex: Complex?

    var body: some View {
        NavigationView {
            List {
                ForEach(store.complexes) { complex in
                    Button(action: { editingComplex = complex }) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(complex.name)
                                .font(.headline)
                                .foregroundColor(.primary)
                            if !complex.address.isEmpty {
                                Text(complex.address)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            if !complex.register2ParkURL.isEmpty {
                                Text(complex.register2ParkURL)
                                    .font(.caption2)
                                    .foregroundColor(.blue)
                                    .lineLimit(1)
                            }
                        }
                        .padding(.vertical, 2)
                    }
                }
            }
            .navigationTitle("Complexes")
            .sheet(item: $editingComplex) { complex in
                EditComplexView(complex: complex)
            }
        }
    }
}

struct EditComplexView: View {
    @EnvironmentObject var store: DataStore
    @Environment(\.dismiss) var dismiss

    let complex: Complex
    @State private var name: String
    @State private var address: String
    @State private var register2ParkURL: String
    @State private var propertyCode: String

    init(complex: Complex) {
        self.complex = complex
        _name = State(initialValue: complex.name)
        _address = State(initialValue: complex.address)
        _register2ParkURL = State(initialValue: complex.register2ParkURL)
        _propertyCode = State(initialValue: complex.propertyCode)
    }

    var body: some View {
        NavigationView {
            Form {
                Section("Complex Info") {
                    TextField("Name", text: $name)
                    TextField("Address", text: $address)
                }
                Section {
                    TextField("Registration URL", text: $register2ParkURL)
                        .keyboardType(.URL)
                        .autocapitalization(.none)
                    TextField("Property Code (if required)", text: $propertyCode)
                        .autocapitalization(.none)
                } header: {
                    Text("Register2Park Settings")
                } footer: {
                    Text("Paste the full URL for this property's register2park.com page. The property code is auto-filled if the site needs it.")
                }
            }
            .navigationTitle("Edit Complex")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") { save() }
                        .fontWeight(.semibold)
                        .disabled(name.isEmpty)
                }
            }
        }
    }

    private func save() {
        var updated = complex
        updated.name = name
        updated.address = address
        updated.register2ParkURL = register2ParkURL
        updated.propertyCode = propertyCode
        store.updateComplex(updated)
        dismiss()
    }
}
