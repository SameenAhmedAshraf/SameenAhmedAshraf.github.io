import Foundation
import Combine

class DataStore: ObservableObject {
    static let shared = DataStore()

    @Published var complexes: [Complex] = [] {
        didSet { save(complexes, key: "complexes") }
    }
    @Published var people: [Person] = [] {
        didSet { save(people, key: "people") }
    }

    private init() {
        complexes = load(key: "complexes") ?? defaultComplexes
        people = load(key: "people") ?? []
    }

    private var defaultComplexes: [Complex] {
        [
            Complex(name: "Complex 1", address: "", register2ParkURL: "https://www.register2park.com/", propertyCode: ""),
            Complex(name: "Complex 2", address: "", register2ParkURL: "https://www.register2park.com/", propertyCode: ""),
            Complex(name: "Complex 3", address: "", register2ParkURL: "https://www.register2park.com/", propertyCode: ""),
        ]
    }

    func addPerson(_ person: Person) {
        people.append(person)
    }

    func updatePerson(_ person: Person) {
        if let idx = people.firstIndex(where: { $0.id == person.id }) {
            people[idx] = person
        }
    }

    func deletePerson(at offsets: IndexSet) {
        people.remove(atOffsets: offsets)
    }

    func updateComplex(_ complex: Complex) {
        if let idx = complexes.firstIndex(where: { $0.id == complex.id }) {
            complexes[idx] = complex
        }
    }

    private func save<T: Encodable>(_ value: T, key: String) {
        if let data = try? JSONEncoder().encode(value) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }

    private func load<T: Decodable>(key: String) -> T? {
        guard let data = UserDefaults.standard.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(T.self, from: data)
    }
}
