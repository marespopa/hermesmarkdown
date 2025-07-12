import { getDate } from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = getDate();

const TravelPlanningTemplate: MarkdownTemplate = {
  filename: "travel-planning",
  frontMatter: {
    title: "Travel Planning",
    description: `A comprehensive template for planning trips, organizing itineraries, and documenting travel experiences.`,
    tags: "travel,planning,itinerary,trip,vacation",
  },
  content: `# ✈️ Travel Planning

**Trip Name:** [Trip Title]
**Destination:** [City, Country]
**Dates:** [Start Date] - [End Date]
**Travelers:** [Number of people]
**Created:** ${date}

---

## 📋 Trip Overview
**Purpose:** [Business/Leisure/Family/Friends]
**Budget:** [Total budget]
**Style:** [Luxury/Mid-range/Budget/Backpacking]
**Pace:** [Relaxed/Moderate/Fast-paced]

---

## 🗓️ Itinerary

### Day 1: [Date] - [Day of Week]
**Location:** [City/Area]
**Accommodation:** [Hotel/Hostel/Airbnb]

#### Morning
- [ ] [Activity 1] - [Time] - [Location]
- [ ] [Activity 2] - [Time] - [Location]

#### Afternoon
- [ ] [Activity 3] - [Time] - [Location]
- [ ] [Activity 4] - [Time] - [Location]

#### Evening
- [ ] [Activity 5] - [Time] - [Location]
- [ ] [Dinner] - [Time] - [Restaurant]

### Day 2: [Date] - [Day of Week]
**Location:** [City/Area]
**Accommodation:** [Hotel/Hostel/Airbnb]

#### Morning
- [ ] [Activity 1] - [Time] - [Location]
- [ ] [Activity 2] - [Time] - [Location]

#### Afternoon
- [ ] [Activity 3] - [Time] - [Location]
- [ ] [Activity 4] - [Time] - [Location]

#### Evening
- [ ] [Activity 5] - [Time] - [Location]
- [ ] [Dinner] - [Time] - [Restaurant]

### Day 3: [Date] - [Day of Week]
**Location:** [City/Area]
**Accommodation:** [Hotel/Hostel/Airbnb]

#### Morning
- [ ] [Activity 1] - [Time] - [Location]
- [ ] [Activity 2] - [Time] - [Location]

#### Afternoon
- [ ] [Activity 3] - [Time] - [Location]
- [ ] [Activity 4] - [Time] - [Location]

#### Evening
- [ ] [Activity 5] - [Time] - [Location]
- [ ] [Dinner] - [Time] - [Restaurant]

---

## 🏨 Accommodations

### Hotel 1: [Hotel Name]
- **Address:** [Full address]
- **Phone:** [Phone number]
- **Check-in:** [Date and time]
- **Check-out:** [Date and time]
- **Confirmation #:** [Booking reference]
- **Cost:** [Price per night]
- **Amenities:** [WiFi, Pool, Gym, etc.]
- **Notes:** [Special requests or notes]

### Hotel 2: [Hotel Name]
- **Address:** [Full address]
- **Phone:** [Phone number]
- **Check-in:** [Date and time]
- **Check-out:** [Date and time]
- **Confirmation #:** [Booking reference]
- **Cost:** [Price per night]
- **Amenities:** [WiFi, Pool, Gym, etc.]
- **Notes:** [Special requests or notes]

---

## 🚗 Transportation

### Flights
#### Outbound Flight
- **Airline:** [Airline name]
- **Flight #:** [Flight number]
- **Departure:** [Airport] - [Date] - [Time]
- **Arrival:** [Airport] - [Date] - [Time]
- **Confirmation #:** [Booking reference]
- **Cost:** [Price]

#### Return Flight
- **Airline:** [Airline name]
- **Flight #:** [Flight number]
- **Departure:** [Airport] - [Date] - [Time]
- **Arrival:** [Airport] - [Date] - [Time]
- **Confirmation #:** [Booking reference]
- **Cost:** [Price]

### Local Transportation
- [ ] [Transportation method 1] - [Cost] - [Notes]
- [ ] [Transportation method 2] - [Cost] - [Notes]
- [ ] [Transportation method 3] - [Cost] - [Notes]

---

## 🍽️ Dining Plans

### Restaurants to Try
- [ ] [Restaurant 1] - [Cuisine] - [Location] - [Price range]
- [ ] [Restaurant 2] - [Cuisine] - [Location] - [Price range]
- [ ] [Restaurant 3] - [Cuisine] - [Location] - [Price range]

### Must-Try Local Dishes
- [ ] [Dish 1] - [Where to find it]
- [ ] [Dish 2] - [Where to find it]
- [ ] [Dish 3] - [Where to find it]

---

## 🎯 Activities & Attractions

### Must-See Attractions
- [ ] [Attraction 1] - [Location] - [Cost] - [Best time to visit]
- [ ] [Attraction 2] - [Location] - [Cost] - [Best time to visit]
- [ ] [Attraction 3] - [Location] - [Cost] - [Best time to visit]

### Optional Activities
- [ ] [Activity 1] - [Location] - [Cost] - [Notes]
- [ ] [Activity 2] - [Location] - [Cost] - [Notes]
- [ ] [Activity 3] - [Location] - [Cost] - [Notes]

### Tours & Experiences
- [ ] [Tour 1] - [Duration] - [Cost] - [Booking required]
- [ ] [Tour 2] - [Duration] - [Cost] - [Booking required]
- [ ] [Tour 3] - [Duration] - [Cost] - [Booking required]

---

## 💰 Budget Breakdown

### Transportation
- **Flights:** [Cost]
- **Local Transport:** [Cost]
- **Car Rental:** [Cost if applicable]

### Accommodation
- **Hotels:** [Total cost]
- **Fees:** [Resort fees, taxes, etc.]

### Activities
- **Attractions:** [Cost]
- **Tours:** [Cost]
- **Entertainment:** [Cost]

### Food & Dining
- **Restaurants:** [Estimated cost]
- **Groceries:** [Estimated cost]

### Miscellaneous
- **Shopping:** [Budget]
- **Tips:** [Budget]
- **Emergency Fund:** [Amount]

**Total Budget:** [Sum of all categories]

---

## 📱 Important Information

### Emergency Contacts
- **Local Emergency:** [Emergency number]
- **Hotel:** [Hotel phone]
- **Embassy:** [Embassy contact]
- **Travel Insurance:** [Insurance company and policy number]

### Local Customs & Etiquette
- [Custom 1]
- [Custom 2]
- [Custom 3]

### Language Basics
- **Hello:** [Local greeting]
- **Thank you:** [Local thank you]
- **Goodbye:** [Local goodbye]
- **Please:** [Local please]

---

## 🎒 Packing List

### Documents
- [ ] Passport
- [ ] Visa (if required)
- [ ] Travel insurance
- [ ] Flight confirmations
- [ ] Hotel confirmations
- [ ] Credit cards
- [ ] Cash in local currency

### Electronics
- [ ] Phone & charger
- [ ] Camera
- [ ] Power adapter
- [ ] Portable charger
- [ ] Headphones

### Clothing
- [ ] [Weather-appropriate clothing]
- [ ] [Comfortable shoes]
- [ ] [Swimwear if needed]
- [ ] [Formal wear if needed]

### Toiletries
- [ ] [Essential toiletries]
- [ ] [Medications]
- [ ] [First aid kit]

---

## 📍 Maps & Directions
**Hotel to Airport:** [Directions]
**Hotel to City Center:** [Directions]
**Key Attractions:** [Directions between major sites]

---

## 📝 Notes & Tips
- [Tip 1]
- [Tip 2]
- [Tip 3]

---

## ✅ Pre-Trip Checklist
- [ ] Book flights
- [ ] Book accommodations
- [ ] Book activities/tours
- [ ] Get travel insurance
- [ ] Check visa requirements
- [ ] Get vaccinations (if needed)
- [ ] Notify bank of travel
- [ ] Download offline maps
- [ ] Pack bags
- [ ] Set up phone for international use

---

## 🏷️ Tags
#travel #vacation #[destination] #[trip-type] #[date]
`,
};

export default TravelPlanningTemplate; 