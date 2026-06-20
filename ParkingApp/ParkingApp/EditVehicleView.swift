import SwiftUI

struct EditVehicleView: View {
    @Environment(\.dismiss) var dismiss

    let existingVehicle: Vehicle?
    let onSave: (Vehicle) -> Void

    @State private var make: String
    @State private var model: String
    @State private var year: String
    @State private var color: String
    @State private var licensePlate: String
    @State private var state: String

    let usStates = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
                    "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
                    "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
                    "VA","WA","WV","WI","WY","DC"]

    init(vehicle: Vehicle?, onSave: @escaping (Vehicle) -> Void) {
        self.existingVehicle = vehicle
        self.onSave = onSave
        _make = State(initialValue: vehicle?.make ?? "")
        _model = State(initialValue: vehicle?.model ?? "")
        _year = State(initialValue: vehicle?.year ?? "")
        _color = State(initialValue: vehicle?.color ?? "")
        _licensePlate = State(initialValue: vehicle?.licensePlate ?? "")
        _state = State(initialValue: vehicle?.state ?? "CA")
    }

    var isValid: Bool { !make.isEmpty && !model.isEmpty && !licensePlate.isEmpty }

    var body: some View {
        NavigationView {
            Form {
                Section("Vehicle") {
                    TextField("Make (e.g. Toyota)", text: $make)
                    TextField("Model (e.g. Camry)", text: $model)
                    TextField("Year (e.g. 2022)", text: $year)
                        .keyboardType(.numberPad)
                    TextField("Color", text: $color)
                }
                Section("Plate") {
                    TextField("License Plate", text: $licensePlate)
                        .autocapitalization(.allCharacters)
                    Picker("State", selection: $state) {
                        ForEach(usStates, id: \.self) { s in
                            Text(s).tag(s)
                        }
                    }
                }
            }
            .navigationTitle(existingVehicle == nil ? "Add Vehicle" : "Edit Vehicle")
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
        }
    }

    private func save() {
        var vehicle = existingVehicle ?? Vehicle(make: "", model: "", year: "", color: "", licensePlate: "", state: "")
        vehicle.make = make
        vehicle.model = model
        vehicle.year = year
        vehicle.color = color
        vehicle.licensePlate = licensePlate.uppercased()
        vehicle.state = state
        onSave(vehicle)
        dismiss()
    }
}
