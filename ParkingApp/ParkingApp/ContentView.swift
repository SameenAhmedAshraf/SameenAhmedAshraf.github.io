import SwiftUI

struct ContentView: View {
    @EnvironmentObject var store: DataStore

    var body: some View {
        TabView {
            RegisterParkingView()
                .tabItem {
                    Label("Register", systemImage: "car.fill")
                }
            PeopleListView()
                .tabItem {
                    Label("People", systemImage: "person.2.fill")
                }
            ComplexesView()
                .tabItem {
                    Label("Complexes", systemImage: "building.2.fill")
                }
        }
    }
}
