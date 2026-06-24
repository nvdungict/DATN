# Section 2.3 — Functional Description

---

## 2.3 Functional Description

This section details the most critical use cases of the TravelAI system. Each use case description outlines the standard sequence of events (main flow), alternative scenarios (alternate flows), and the system state before and after the interaction (preconditions and postconditions).

### 2.3.1 Description of use case: Authenticate

| Item | Description |
|---|---|
| **Use Case Name** | Authenticate (Login & Registration) |
| **Primary Actor** | Traveler |
| **Secondary Actor(s)** | None |
| **Preconditions** | The Traveler is currently unauthenticated. |
| **Postconditions** | The Traveler is successfully authenticated, an account is created (if registering), and an active session is granted. |

**Main Flow:**
1. The Traveler navigates to the authentication interface.
2. The Traveler selects either the "Login" or "Register" action.
3. The Traveler submits their credentials (e.g., email and password) along with any required profile information (if registering).
4. The system validates the input format.
5. Depending on the action:
   - *If Registering:* The system creates a new user account in the database.
   - *If Logging In:* The system verifies the Traveler's credentials against existing records.
6. The system issues a secure session token to the Traveler.
7. The system redirects the Traveler to the main application dashboard or the originally requested page.

**Alternate Flows:**

**A1. Invalid Credentials (Login)**

If the credentials provided at step 5 do not match or are incorrect, the system denies access and displays an error message.

**A2. Email Already Exists (Registration)**

If the Traveler attempts to register with an email already associated with an account at step 5, the system prevents registration and prompts the Traveler to log in instead.

**A3. Missing Information**

If the Traveler submits the form without required fields at step 3, the system highlights the missing fields and prevents submission.

**A4. Account Locked (Login)**

If the Traveler exceeds the maximum number of allowed failed login attempts, the system temporarily locks the account and notifies the Traveler.

---

### 2.3.2 Description of use case: Generate Travel Itinerary

| Item | Description |
|---|---|
| **Use Case Name** | Generate Travel Itinerary |
| **Primary Actor** | Traveler |
| **Secondary Actor(s)** | Place Search Service |
| **Preconditions** | The Traveler is authenticated and logged into the system. |
| **Postconditions** | A new, structured day-by-day travel itinerary is generated, saved in the system, and presented to the Traveler. |

**Main Flow:**
1. The Traveler navigates to the trip creation interface.
2. The Traveler submits a natural language request specifying the destination, travel dates, and budget.
3. The system validates and processes the travel request.
4. The system queries external services to retrieve relevant travel information.
5. The system generates a comprehensive itinerary covering activities, transportation, and lodging within the specified constraints.
6. The system calculates the estimated total cost and validates it against the user's budget constraint.
7. The system saves the newly generated itinerary.
8. The system displays the final structured itinerary to the Traveler on the trip details page.

**Alternate Flows:**

**A1. Invalid Parameters**

If the dates are logically invalid or the destination is ambiguous at step 3, the system prompts the Traveler to clarify or provide valid information.

**A2. Budget Constraint Failed**

If the generated plan exceeds the budget at step 6, the system attempts an internal regeneration for cheaper alternatives. If it still fails, the system presents the plan but includes a warning message indicating that the budget may be exceeded.

**A3. External Search Service Unavailable**

If the Place Search Service cannot be reached at step 4, the system informs the Traveler that itinerary generation is temporarily unavailable.

---

### 2.3.3 Description of use case: Manage Itinerary

| Item | Description |
|---|---|
| **Use Case Name** | Manage Itinerary |
| **Primary Actor** | Traveler |
| **Secondary Actor(s)** | None |
| **Preconditions** | A valid generated itinerary already exists and is currently being viewed by the Traveler. |
| **Postconditions** | The structural or state changes made to the itinerary are successfully persisted. The updated itinerary is immediately reflected in the user interface. |

**Main Flow:**
1. The Traveler views the itinerary, which is grouped chronologically by day.
2. The Traveler performs a management action, and the system responds accordingly:

   | Action | System Response |
   |---|---|
   | **Reorder** | Recalculate the timeline and save the new order. |
   | **Confirm** | Update the activity status to "Confirmed". |
   | **Complete** | Update the activity status to "Completed". |
   | **Remove** | Delete the activity and recalculate the remaining timeline for that day. |

3. The system saves the modifications.
4. The system immediately updates the user interface to reflect the new state.

**Alternate Flows:**

**A1. Time Conflict**

If reordering an activity causes a time overlap with another scheduled event at step 2, the system displays a warning notification to the Traveler but still allows the change.

**A2. System Error (Save Failed)**

If the system fails to persist the changes at step 3, it alerts the Traveler that the modifications could not be saved.

---

### 2.3.4 Description of use case: Chat with AI Assistant

| Item | Description |
|---|---|
| **Use Case Name** | Chat with AI Assistant |
| **Primary Actor** | Traveler |
| **Secondary Actor(s)** | Place Search Service |
| **Preconditions** | An itinerary already exists, and the Traveler is viewing the trip interface. The system has loaded the current itinerary context. |
| **Postconditions** | The AI assistant provides a response to the Traveler's query. If the Traveler requested a modification, the itinerary is updated accordingly. |

**Main Flow:**
1. The Traveler opens the AI Chat panel within the trip interface.
2. The Traveler types and sends a natural language message.
3. The system processes the message along with the current itinerary context.
4. The system analyzes the message and classifies the intent (e.g., Modification, Question, or General Chat).
5. The system prepares the response, retrieving additional travel information from external services if required.
6. The system applies any requested changes to the itinerary.
7. The system streams the textual response back to the chat interface.
8. The system updates the UI to instantly display the updated itinerary alongside the chat.

**Alternate Flows:**

**A1. Intent Not Understood**

If the system cannot determine the Traveler's intent at step 4, it returns a conversational response asking for clarification.

**A2. External Service Failure**

If external information retrieval fails at step 5, the system informs the Traveler that it cannot fetch new places at the moment and suggests trying again later.

---

### 2.3.5 Description of use case: Search and Book Flight

| Item | Description |
|---|---|
| **Use Case Name** | Search and Book Flight |
| **Primary Actor** | Traveler |
| **Secondary Actor(s)** | Flight Search Service, VNPay Payment Gateway |
| **Preconditions** | The Traveler has a transportation item in their itinerary, a flight has been selected for booking, and the VNPay payment gateway is available. |
| **Postconditions** | A flight booking reference is created, and the transportation itinerary item's status is updated to "Confirmed". |

**Main Flow:**
1. The Traveler clicks the "Book" button on a transportation itinerary item.
2. The system queries the Flight Search Service using the item's parameters.
3. The system displays a list of available flight offers with pricing and airline details.
4. The Traveler selects a preferred flight offer and clicks "Proceed to Payment".
5. The system initiates a secure payment session and redirects the Traveler to the payment gateway.
6. The Traveler enters their payment details and authorizes the transaction.
7. The payment gateway processes the transaction and redirects the Traveler back to the TravelAI system.
8. The system validates the payment result before confirming the booking.
9. The system saves the booking reference and updates the itinerary item status to "Confirmed".
10. The system displays a booking success confirmation to the Traveler.

**Alternate Flows:**

**A1. No Flights Found**

If no flights match the criteria at step 3, the system displays a "No flights found" message and suggests modifying the travel date.

**A2. Payment Failed or Cancelled**

If the payment fails or the user cancels at step 7, the payment gateway returns a failure status. The system displays an error message, and the itinerary item status remains unchanged.

**A3. Invalid Payment Validation**

If the payment result validation fails at step 8, the system rejects the transaction for security reasons and shows an error message.

---

### 2.3.6 Description of use case: Search and Book Hotel

| Item | Description |
|---|---|
| **Use Case Name** | Search and Book Hotel |
| **Primary Actor** | Traveler |
| **Secondary Actor(s)** | Hotel Search Service, VNPay Payment Gateway |
| **Preconditions** | The Traveler has a lodging/accommodation item in their itinerary, a hotel has been selected for booking, and the VNPay payment gateway is available. |
| **Postconditions** | A hotel booking reference is created, and the lodging itinerary item's status is updated to "Confirmed". |

**Main Flow:**
1. The Traveler clicks the "Book" button on a lodging itinerary item.
2. The system queries the Hotel Search Service using the destination city and stay dates.
3. The system displays a list of available hotel and room offers.
4. The Traveler selects a preferred hotel room and clicks "Proceed to Payment".
5. The system initiates a payment session and redirects the Traveler to the payment gateway.
6. The Traveler enters their payment details and authorizes the transaction.
7. The payment gateway processes the transaction and redirects the Traveler back.
8. The system validates the payment result before confirming the booking.
9. The system saves the hotel booking details and updates the itinerary item status to "Confirmed".
10. The system displays a booking success confirmation message.

**Alternate Flows:**

**A1. No Hotels Found**

If no hotels are available for those dates at step 3, the system suggests alternative dates or nearby locations.

**A2. Payment Failed or Cancelled**

If the payment fails or the user cancels at step 7, the system displays a failure message, and the itinerary item is not confirmed.

**A3. Invalid Payment Validation**

If the payment result validation fails at step 8, the system rejects the transaction for security reasons and shows an error message.
