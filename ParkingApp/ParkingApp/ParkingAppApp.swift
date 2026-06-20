import SwiftUI

@main
struct ParkingAppApp: App {
    @StateObject private var store = DataStore.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
        }
    }
}
