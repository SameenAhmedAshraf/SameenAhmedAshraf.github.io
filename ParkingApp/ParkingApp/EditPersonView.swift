import SwiftUI

struct EditPersonView: View {
    @EnvironmentObject var store: DataStore
    @Environment(\.dismiss) var dismiss

    let existingPerson: Person?

    @State private var name: String
    @State private var email: String
    @State private var phone: String
    @State private var apartmentNumber: String
    @State private var vehicles: [Vehicle]
    @State private var showingAddVehicle = false
    @State private var editingVehicle: Vehicle?

    init(person: Person?) {
        self.existingPerson = person
        _name = State(initialValue: person?.name ?? "")
        _email = State(initialValue: person?.email ?? "")
        _phone = State(initialValue: person?.phone ?? "")
        _apartmentNumber = State(initialValue: person?.apartmentNumber ?? "")
        _vehicles = State(initialValue: person?.vehicles ?? [])
    }

    var isValid: Bool { !name.isEmpty && !apartmentNumber.isEmpty }

    var body: some View {
        NavigationView {
            Form {
                Section("Info") {
                    TextField("Full Name", text: $name)
                    TextField("Apartment Number", text: $apartmentNumber)
                        .keyboardType(.numberPad)
                    TextField("Email", text: $email)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                    TextField("Phone", text: $phone)
                        .keyboardType(.phonePad)
                }

                Section {
                    ForEach(vehicles) { vehicle in
                        Button(action: { editingVehicle = vehicle }) {
                            VehicleRowView(vehicle: vehicle)
                        }
                        .foregroundColor(.primary)
                    }
                    .onDelete { offsets in
                        vehicles.remove(atOffsets: offsets)
                    }
                    Button(action: { showingAddVehicle = true }) {
                        Label("Add Vehicle", systemImage: "plus.circle")
                    }
                } header: {
                    Text("Vehicles")
                }
            }
            .navigationTitle(existingPerson == nil ? "New Person" : "Edit Person")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") { save() }
                        .disabled(!isValid)
                        .fontWeight(.semibold)
                }
            }
            .sheet(isPresented: $showingAddVehicle) {
                EditVehicleView(vehicle: nil) { newVehicle in
                    vehicles.append(newVehicle)
                }
            }
            .sheet(item: $editingVehicle) { vehicle in
                EditVehicleView(vehicle: vehicle) { updated in
                    if let idx = vehicles.firstIndex(where: { $0.id == updated.id }) {
                        vehicles[idx] = updated
                    }
                }
            }
        }
    }

    private func save() {
        var person = existingPerson ?? Person(name: "", email: "", phone: "", apartmentNumber: "")
        person.name = name
        person.email = email
        person.phone = phone
        person.apartmentNumber = apartmentNumber
        person.vehicles = vehicles

        if existingPerson != nil {
            store.updatePerson(person)
        } else {
            store.addPerson(person)
        }
        dismiss()
    }
}

struct VehicleRowView: View {
    let vehicle: Vehicle

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("\(vehicle.year) \(vehicle.make) \(vehicle.model)")
                .font(.subheadline)
                .fontWeight(.medium)
            Text("\(vehicle.color) · \(vehicle.licensePlate) (\(vehicle.state))")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 2)
    }
}
