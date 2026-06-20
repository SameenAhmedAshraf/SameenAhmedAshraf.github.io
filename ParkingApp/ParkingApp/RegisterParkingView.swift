import SwiftUI

struct RegisterParkingView: View {
    @EnvironmentObject var store: DataStore

    @State private var selectedComplex: Complex?
    @State private var selectedPerson: Person?
    @State private var selectedVehicle: Vehicle?
    @State private var showWebView = false

    var body: some View {
        NavigationView {
            Form {
                Section("Select Complex") {
                    ForEach(store.complexes) { complex in
                        Button(action: { selectedComplex = complex }) {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(complex.name)
                                        .foregroundColor(.primary)
                                        .fontWeight(selectedComplex?.id == complex.id ? .semibold : .regular)
                                    if !complex.address.isEmpty {
                                        Text(complex.address)
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                }
                                Spacer()
                                if selectedComplex?.id == complex.id {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(.blue)
                                }
                            }
                        }
                    }
                }

                Section("Select Person") {
                    if store.people.isEmpty {
                        Text("No people saved — add them in the People tab")
                            .foregroundColor(.secondary)
                            .font(.caption)
                    } else {
                        ForEach(store.people) { person in
                            Button(action: {
                                selectedPerson = person
                                selectedVehicle = person.vehicles.first
                            }) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(person.name)
                                            .foregroundColor(.primary)
                                            .fontWeight(selectedPerson?.id == person.id ? .semibold : .regular)
                                        Text("Apt \(person.apartmentNumber)")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                    Spacer()
                                    if selectedPerson?.id == person.id {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundColor(.blue)
                                    }
                                }
                            }
                        }
                    }
                }

                if let person = selectedPerson, !person.vehicles.isEmpty {
                    Section("Select Vehicle") {
                        ForEach(person.vehicles) { vehicle in
                            Button(action: { selectedVehicle = vehicle }) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("\(vehicle.year) \(vehicle.make) \(vehicle.model)")
                                            .foregroundColor(.primary)
                                            .fontWeight(selectedVehicle?.id == vehicle.id ? .semibold : .regular)
                                        Text("\(vehicle.licensePlate) · \(vehicle.state) · \(vehicle.color)")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                    Spacer()
                                    if selectedVehicle?.id == vehicle.id {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundColor(.blue)
                                    }
                                }
                            }
                        }
                    }
                }

                Section {
                    Button(action: { showWebView = true }) {
                        HStack {
                            Spacer()
                            Label("Open & Auto-Fill Form", systemImage: "arrow.right.circle.fill")
                                .fontWeight(.semibold)
                            Spacer()
                        }
                    }
                    .disabled(selectedComplex == nil || selectedPerson == nil || selectedVehicle == nil)
                }
            }
            .navigationTitle("Register Parking")
            .sheet(isPresented: $showWebView) {
                if let complex = selectedComplex, let person = selectedPerson, let vehicle = selectedVehicle {
                    ParkingWebView(complex: complex, person: person, vehicle: vehicle)
                }
            }
        }
    }
}
