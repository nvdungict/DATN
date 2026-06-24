# Section 2.2 — Functional Overview

---

## 2.2 Functional Overview

TravelAI is a web-based intelligent travel assistance system that allows users to plan, manage, refine, and book personalized travel itineraries through natural language interaction. Users interact with the system through a unified interface that integrates conversational AI, structured itinerary management, map visualization, and transportation and accommodation booking. The system supports four broad functional areas: (i) account and profile management, (ii) AI-assisted travel planning and itinerary generation, (iii) interactive itinerary viewing and refinement, and (iv) transportation and accommodation booking. The following subsections model these functional areas using use case diagrams, progressing from a high-level overview to detailed decompositions of each major use case.

---

## 2.2.1 General Use Case Diagram

### Actors

- **Traveler** is the primary actor. A Traveler is an authenticated user who interacts with the system to create and manage travel plans, converse with the AI assistant, book flights and hotels, and track itinerary progress. All core use cases are initiated by this actor.
- **Place Search Service** is a secondary actor representing the external web search API. It is invoked during itinerary generation to retrieve real-world destination and point-of-interest data.
- **Flight Search Service** is a secondary actor representing the external flight search API. It is queried when the Traveler searches for available flights within the booking interface.
- **Hotel Search Service** is a secondary actor representing the external hotel availability API. It is queried when the Traveler searches for available accommodations within the booking interface.
- **VNPay Payment Gateway** is a secondary actor representing the VNPay payment processing service. It handles payment initiation, redirect, and result notification during the booking confirmation flow.

### High-Level Use Cases

| ID | Use Case | Actor(s) |
|---|---|---|
| UC01 | Authenticate | Traveler |
| UC02 | Manage Profile | Traveler |
| UC03 | Generate Travel Itinerary | Traveler, Place Search Service |
| UC04 | Chat with AI Assistant | Traveler, Place Search Service |
| UC05 | Manage Itinerary | Traveler |
| UC06 | Manage Trips | Traveler |
| UC07 | Search and Book Flight | Traveler, Flight Search Service, VNPay Payment Gateway |
| UC08 | Search and Book Hotel | Traveler, Hotel Search Service, VNPay Payment Gateway |

*Table 2.2 — High-level use cases of the TravelAI system*

---

### [FIGURE 2.1 — General Use Case Diagram]

**Hướng dẫn vẽ biểu đồ:**
- System boundary box nhãn: "TravelAI System"
- Actor bên trái: Traveler
- Actor bên phải: Place Search Service, Flight Search Service, Hotel Search Service, VNPay Payment Gateway
- Use Cases bên trong: UC01 đến UC08
- Associations:
  - Traveler --> UC01, UC02, UC03, UC04, UC05, UC06, UC07, UC08
  - Place Search Service --> UC03, UC04
  - Flight Search Service --> UC07
  - Hotel Search Service --> UC08
  - VNPay Payment Gateway --> UC07, UC08
- Caption: Figure 2.1 — General Use Case Diagram of TravelAI

---

### Brief Description of Each Use Case

**UC01 – Authenticate:** Allows a visitor to register a new account or log in to an existing one. Upon successful authentication, the system issues a session token required to access all other features.

**UC02 – Manage Profile:** Allows the Traveler to view and update personal travel preferences. These preferences are used by the system to personalize future itinerary recommendations.

**UC03 – Generate Travel Itinerary:** Allows the Traveler to submit a travel request in natural language, upon which the system automatically produces a complete, structured day-by-day itinerary. The Place Search Service is queried to retrieve real-world location data.

**UC04 – Chat with AI Assistant:** Allows the Traveler to engage in multi-turn natural language conversation with the AI assistant in the context of an existing trip, requesting modifications, asking travel questions, or instructing regeneration. The Place Search Service may be invoked as part of this process.

**UC05 – Manage Itinerary:** Allows the Traveler to view the itinerary locations on the map, reorder activities via drag-and-drop, confirm planned activities, and mark completed activities. Changes are persisted immediately.

**UC06 – Manage Trips:** Allows the Traveler to view all created trips, access individual trip details, and delete trips.

**UC07 – Search and Book Flight:** Allows the Traveler to search for available flights relevant to a transportation itinerary item, select a preferred offer, and complete payment through the VNPay payment gateway. Upon successful payment, the itinerary item is updated to Confirmed.

**UC08 – Search and Book Hotel:** Allows the Traveler to search for available hotels relevant to a lodging itinerary item, select a preferred offer, and complete payment through the VNPay payment gateway. Upon successful payment, the itinerary item is updated to Confirmed.

---

## 2.2.2 Detailed Use Case Diagrams

### 2.2.2.1 Authenticate

---

**[FIGURE 2.2 — Detailed Use Case Diagram: Authenticate]**

Hướng dẫn vẽ:
- System boundary: "Authenticate"
- Actor: Traveler (trái)
- Use Cases: Register Account, Login, Change Password (<<extend>>)
- Associations:
  - Traveler --> Register Account, Login
  - Change Password: <<extend>> từ Login
- Caption: Figure 2.2 — Detailed Use Case Diagram: Authenticate

---

This use case manages user access to the system. Travelers can create a new account or log in using existing credentials. A change password option is available for authenticated users who wish to update their security credentials.

| Sub-Use Case | Description |
|---|---|
| Register Account | Traveler creates a new account with email and password |
| Login | Traveler authenticates using existing credentials |
| Change Password | Traveler updates their current password with a new one |

---

### 2.2.2.2 Manage Profile

---

**[FIGURE 2.3 — Detailed Use Case Diagram: Manage Profile]**

Hướng dẫn vẽ:
- System boundary: "Manage Profile"
- Actor: Traveler (trái)
- Use Cases: View Profile Preferences, Update Preferences, Save Preferences
- Associations:
  - Traveler --> View Profile Preferences, Update Preferences
  - Save Preferences: <<include>> từ Update Preferences
- Caption: Figure 2.3 — Detailed Use Case Diagram: Manage Profile

---

This use case allows the Traveler to review and edit travel preferences stored in their profile. When saved, preferences are retrieved by the system to personalize future itinerary generation.

| Sub-Use Case | Description |
|---|---|
| View Profile Preferences | Traveler views their currently stored travel preferences |
| Update Preferences | Traveler edits one or more preference fields |
| Save Preferences | Traveler confirms changes, which are persisted to the system |

---

### 2.2.2.3 Generate Travel Itinerary

---

**[FIGURE 2.4 — Detailed Use Case Diagram: Generate Travel Itinerary]**

Hướng dẫn vẽ:
- System boundary: "Generate Travel Itinerary"
- Actors: Traveler (trái), Place Search Service (phải)
- Use Cases: Provide Trip Information, Specify Travel Preferences (<<extend>>), Search Real-World Places (<<include>>), Validate Budget Constraints (<<include>>), Display Generated Itinerary
- Associations:
  - Traveler --> Provide Trip Information, Specify Travel Preferences, Display Generated Itinerary
  - Search Real-World Places: <<include>> từ Provide Trip Information
  - Validate Budget Constraints: <<include>> từ Provide Trip Information
  - Place Search Service --> Search Real-World Places
- Caption: Figure 2.4 — Detailed Use Case Diagram: Generate Travel Itinerary

---

This use case is the central capability of the system. When the Traveler initiates a trip creation request, they provide the destination, travel dates, and budget. The system searches for real-world places and validates against budget constraints before presenting the final itinerary. The Traveler may optionally specify preferences to further guide generation.

| Sub-Use Case | Description |
|---|---|
| Provide Trip Information | Traveler inputs destination, travel dates, and budget |
| Specify Travel Preferences | Traveler optionally inputs preferences |
| Search Real-World Places | System queries Place Search Service for verified location data |
| Validate Budget Constraints | System checks total estimated cost against stated budget |
| Display Generated Itinerary | System presents the structured day-by-day itinerary |

---

### 2.2.2.4 Chat with AI Assistant

---

**[FIGURE 2.5 — Detailed Use Case Diagram: Chat with AI Assistant]**

Hướng dẫn vẽ:
- System boundary: "Chat with AI Assistant"
- Actors: Traveler (trái), Place Search Service (phải)
- Use Cases: Send Message, View Conversation History, Request Itinerary Modification, Request Travel Information, Receive Streaming Response
- Associations:
  - Traveler --> Send Message, View Conversation History
  - Request Itinerary Modification: <<extend>> từ Send Message
  - Request Travel Information: <<extend>> từ Send Message
  - Receive Streaming Response: <<include>> từ Send Message
  - Place Search Service --> Request Travel Information, Request Itinerary Modification
- Caption: Figure 2.5 — Detailed Use Case Diagram: Chat with AI Assistant

---

This use case represents the conversational interface in the context of a specific trip. The Traveler sends free-text messages to request changes, ask questions, or regenerate the plan. The system returns a streaming response.

| Sub-Use Case | Description |
|---|---|
| Send Message | Traveler submits a natural language message in the chat interface |
| View Conversation History | Traveler reviews prior messages exchanged in the current session |
| Request Itinerary Modification | Traveler asks the assistant to modify aspects of the itinerary |
| Request Travel Information | Traveler asks a travel-related question without modifying the plan |
| Receive Streaming Response | System returns the AI assistant response progressively |

---

### 2.2.2.5 Manage Itinerary

---

**[FIGURE 2.6 — Detailed Use Case Diagram: Manage Itinerary]**

Hướng dẫn vẽ:
- System boundary: "Manage Itinerary"
- Actor: Traveler (trái)
- Use Cases: View Itinerary by Day, Reorder Activities, Confirm Activity, Mark Activity as Completed, Remove Activity
- Associations:
  - Traveler --> View Itinerary by Day, Reorder Activities, Confirm Activity, Remove Activity
  - Mark Activity as Completed: <<extend>> từ Confirm Activity
- Caption: Figure 2.6 — Detailed Use Case Diagram: Manage Itinerary

---

This use case covers all post-generation interactions on a trip itinerary. Activities are displayed grouped by day and can be reordered via drag-and-drop. Each activity follows the lifecycle: Suggested -> Confirmed -> Completed.

| Sub-Use Case | Description |
|---|---|
| View Itinerary by Day | Traveler browses the itinerary grouped by day |
| Reorder Activities | Traveler drags and drops items to change the order |
| Confirm Activity | Traveler confirms a suggested activity |
| Mark Activity as Completed | Traveler marks a confirmed activity as completed |
| Remove Activity | Traveler removes an item from the itinerary |

---

### 2.2.2.6 Manage Trips

---

**[FIGURE 2.7 — Detailed Use Case Diagram: Manage Trips]**

Hướng dẫn vẽ:
- System boundary: "Manage Trips"
- Actor: Traveler (trái)
- Use Cases: View Trip List, View Trip Details, Delete Trip
- Associations:
  - Traveler --> View Trip List, View Trip Details, Delete Trip
- Caption: Figure 2.7 — Detailed Use Case Diagram: Manage Trips

---

This use case allows users to oversee all their generated trips in one place, review specific trip summaries, and delete trips they no longer need.

| Sub-Use Case | Description |
|---|---|
| View Trip List | Traveler views all created trips |
| View Trip Details | Traveler accesses specific trip details |
| Delete Trip | Traveler removes a trip from their account |

---

### 2.2.2.7 Search and Book Flight

---

**[FIGURE 2.8 — Detailed Use Case Diagram: Search and Book Flight]**

Hướng dẫn vẽ:
- System boundary: "Search and Book Flight"
- Actors: Traveler (trái), Flight Search Service (phải trên), VNPay Payment Gateway (phải dưới)
- Use Cases: Open Flight Booking Panel, Search Available Flights (<<include>>), Select Flight Offer, Initiate Payment (<<include>>), Receive Payment Result (<<include>>), Update Booking Status
- Associations:
  - Traveler --> Open Flight Booking Panel, Select Flight Offer
  - Search Available Flights: <<include>> từ Open Flight Booking Panel
  - Initiate Payment: <<include>> từ Select Flight Offer
  - Receive Payment Result: <<include>> từ Initiate Payment
  - Flight Search Service --> Search Available Flights
  - VNPay Payment Gateway --> Initiate Payment, Receive Payment Result
  - (Hệ thống tự thực hiện Update Booking Status sau khi Receive Payment Result, không nối từ Traveler)
- Caption: Figure 2.8 — Detailed Use Case Diagram: Search and Book Flight

---

This use case is triggered when the Traveler selects a transportation itinerary item and initiates the booking flow. The system displays available flight offers retrieved in real time. The Traveler selects a preferred offer, initiating a payment session. Upon receiving a successful payment result, the system updates the corresponding itinerary item to Confirmed.

| Sub-Use Case | Description |
|---|---|
| Open Flight Booking Panel | Traveler opens the booking interface for a flight |
| Search Available Flights | System queries Flight Search Service |
| Select Flight Offer | Traveler selects a preferred flight |
| Initiate Payment | System creates a payment session and redirects Traveler |
| Receive Payment Result | System receives the payment callback and validates the result |
| Update Booking Status | System updates the itinerary item to Confirmed |

---

### 2.2.2.8 Search and Book Hotel

---

**[FIGURE 2.9 — Detailed Use Case Diagram: Search and Book Hotel]**

Hướng dẫn vẽ:
- System boundary: "Search and Book Hotel"
- Actors: Traveler (trái), Hotel Search Service (phải trên), VNPay Payment Gateway (phải dưới)
- Use Cases: Open Hotel Booking Panel, Search Available Hotels (<<include>>), Select Hotel Offer, Initiate Payment (<<include>>), Receive Payment Result (<<include>>), Update Booking Status
- Associations:
  - Traveler --> Open Hotel Booking Panel, Select Hotel Offer
  - Search Available Hotels: <<include>> từ Open Hotel Booking Panel
  - Initiate Payment: <<include>> từ Select Hotel Offer
  - Receive Payment Result: <<include>> từ Initiate Payment
  - Hotel Search Service --> Search Available Hotels
  - VNPay Payment Gateway --> Initiate Payment, Receive Payment Result
  - (Hệ thống tự thực hiện Update Booking Status sau khi Receive Payment Result, không nối từ Traveler)
- Caption: Figure 2.9 — Detailed Use Case Diagram: Search and Book Hotel

---

This use case follows the same structure as UC07 but is triggered from a lodging itinerary item. The system queries the Hotel Search Service, presents available hotel offers, and processes payment upon the Traveler's selection.

| Sub-Use Case | Description |
|---|---|
| Open Hotel Booking Panel | Traveler opens the booking interface for a hotel |
| Search Available Hotels | System queries Hotel Search Service |
| Select Hotel Offer | Traveler selects a preferred hotel |
| Initiate Payment | System creates a payment session and redirects Traveler |
| Receive Payment Result | System receives the payment callback and validates the result |
| Update Booking Status | System updates the itinerary item to Confirmed |

---

## 2.2.3 Business Process

The core business process of TravelAI is the **AI-Assisted Trip Planning, Booking, and Execution** workflow, spanning multiple use cases in a coordinated sequence reflecting the complete lifecycle of a travel plan — from initial creation through booking confirmation and activity completion.

The process begins when the Traveler submits a natural language travel request. After the system returns a structured itinerary, the Traveler reviews it and, if needed, engages the AI assistant to request changes or regeneration. Once satisfied, the Traveler confirms activities and adjusts their order via drag-and-drop. For transportation and accommodation items specifically, the Traveler may initiate an in-app booking flow, search for real-time offers, and complete payment through the VNPay gateway. As the trip progresses, completed activities are marked accordingly.

---

**[FIGURE 2.10 — Activity Diagram: AI-Assisted Trip Planning, Booking, and Execution]**

Hướng dẫn vẽ Activity Diagram (draw.io, 3 swimlane):
- Làn 1: Traveler | Làn 2: TravelAI System | Làn 3: External Services (VNPay + Search APIs)

Luồng hoạt động:
  [Start]
     |
  [Traveler] Submit travel request (destination, dates, budget)
     |
  [System]   Search real-world places (Place Search Service)
     |
  [System]   Validate budget constraints
     |
  [System]   Return structured itinerary
     |
  [Traveler] Review generated itinerary
     |
  <Decision> Satisfied with plan?
    NO  --> [Traveler] Send modification via chat
                |
            [System] Process & regenerate
                | (loop back to Review)
    YES --> [Traveler] Confirm individual activities
     |
  [Traveler] Reorder activities (drag-and-drop if needed)
     |
  <Decision> Item needs booking? (Transportation or Lodging)
    YES --> [Traveler] Open booking panel
                |
            [System] Search offers (Flight/Hotel Service)
                |
            [Traveler] Select offer
                |
            [System] Initiate VNPay payment
                |
            [VNPay]  Process payment
                |
            [System] Receive result, update status -> CONFIRMED
    NO  --> continue
     |
  <Decision> Trip in progress?
    YES --> [Traveler] Mark activities as Completed (repeat per activity)
    NO  --> End of planning phase
     |
  [End]

Caption: Figure 2.10 — Activity Diagram: AI-Assisted Trip Planning, Booking, and Execution Business Process

---
