import Foundation

struct Complex: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var name: String
    var address: String
    var register2ParkURL: String  // Full URL to the property's registration page
    var propertyCode: String      // Property code or ID used by register2park.com
}

struct Vehicle: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var make: String
    var model: String
    var year: String
    var color: String
    var licensePlate: String
    var state: String
}

struct Person: Identifiable, Codable {
    var id: UUID = UUID()
    var name: String
    var email: String
    var phone: String
    var apartmentNumber: String
    var vehicles: [Vehicle] = []
}
