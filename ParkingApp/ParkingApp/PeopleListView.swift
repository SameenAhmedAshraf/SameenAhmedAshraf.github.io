import SwiftUI

struct PeopleListView: View {
    @EnvironmentObject var store: DataStore
    @State private var showingAdd = false
    @State private var editingPerson: Person?

    var body: some View {
        NavigationView {
            List {
                if store.people.isEmpty {
                    ContentUnavailableView("No People", systemImage: "person.slash",
                        description: Text("Tap + to add a person"))
                } else {
                    ForEach(store.people) { person in
                        Button(action: { editingPerson = person }) {
                            PersonRowView(person: person)
                        }
                        .foregroundColor(.primary)
                    }
                    .onDelete(perform: store.deletePerson)
                }
            }
            .navigationTitle("People")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingAdd = true }) {
                        Image(systemName: "plus")
                    }
                }
                ToolbarItem(placement: .navigationBarLeading) {
                    EditButton()
                }
            }
            .sheet(isPresented: $showingAdd) {
                EditPersonView(person: nil)
            }
            .sheet(item: $editingPerson) { person in
                EditPersonView(person: person)
            }
        }
    }
}

struct PersonRowView: View {
    let person: Person

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(person.name)
                    .font(.headline)
                Spacer()
                Text("Apt \(person.apartmentNumber)")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            if !person.vehicles.isEmpty {
                Text(person.vehicles.map { "\($0.year) \($0.make) \($0.model) — \($0.licensePlate)" }.joined(separator: ", "))
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }
        }
        .padding(.vertical, 2)
    }
}
