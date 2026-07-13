# PROJECT_BRIEF.md

# Bantay Eskwela

## School Emergency Response Platform (MVP)

## Overview

Build a modern MVP for a **School Emergency Response Platform** called **Bantay Eskwela**.

The objective is to demonstrate how a teacher can trigger an emergency alert that immediately notifies school administrators and responders.

This is a **demo/prototype**, not a production-ready emergency system.

---

# Primary Demo Flow

```
Teacher clicks Emergency Button
            │
            ▼
Backend receives request
            │
            ▼
Create Incident
            │
            ▼
Update Admin Dashboard
            │
            ▼
Send Telegram Notification
            │
            ▼
Security acknowledges incident
            │
            ▼
Incident resolved
```

---

# Tech Stack

Use:

* Next.js 15 (App Router)
* TypeScript
* TailwindCSS
* shadcn/ui
* Supabase
* Supabase Realtime
* Cloudflare Pages
* Telegram Bot API

---

# Theme

Professional.

Government-grade.

Dark dashboard.

Clean UI.

No playful colors.

Inspired by:

* Linear
* Vercel
* Apple
* Stripe Dashboard

---

# Pages

## Landing Page

Route:

```
/
```

Hero

```
Bantay Eskwela

One Press.
Immediate Response.
Safer Schools.
```

Buttons

* Open Teacher Demo
* Open Dashboard

---

## Teacher Page

Route

```
/teacher
```

Display

```
School

Biñan National High School

Building

B

Room

204

Teacher

Mrs. Santos

Emergency Type

Security Threat
```

Large Button

```
🚨 EMERGENCY
```

When clicked

Call

```
POST /api/incidents
```

Immediately show

```
Emergency Activated
```

---

## Dashboard

Route

```
/dashboard
```

Dashboard contains

### Active Incident Card

```
🚨 ACTIVE INCIDENT

School

Biñan National High School

Building B

Room 204

Teacher

Mrs. Santos

Emergency Type

Security Threat

Time

10:32 AM

Status

ACTIVE
```

Buttons

```
ACKNOWLEDGE

RESPONDING

RESOLVE
```

---

### Timeline

```
10:32

Emergency Activated

────────────

10:32

Telegram Notification Sent

────────────

10:33

Security Acknowledged

────────────

10:34

Responding

────────────

10:38

Resolved
```

---

### School Information

Show

```
School

Biñan National High School

Address

Biñan, Laguna

Principal

Juan Dela Cruz

Emergency Contact

0917-000-0000
```

---

# Database

Create Supabase tables.

## schools

* id
* name
* address
* city
* province
* principal_name
* emergency_contact
* latitude
* longitude

---

## rooms

* id
* school_id
* building
* room_number

---

## incidents

* id
* school_id
* room_id
* teacher_name
* emergency_type
* status
* created_at
* acknowledged_at
* resolved_at

---

## incident_timeline

* id
* incident_id
* message
* created_at

---

# Seed Data

School

```
Biñan National High School
```

Address

```
Biñan, Laguna
```

Principal

```
Juan Dela Cruz
```

Room

```
Building B

Room 204
```

Teacher

```
Mrs. Santos
```

---

# Telegram Notification

Store

```
TELEGRAM_BOT_TOKEN

TELEGRAM_CHAT_ID
```

Notification

```
🚨 SCHOOL EMERGENCY ALERT

School:
Biñan National High School

Location:
Building B - Room 204

Teacher:
Mrs. Santos

Emergency Type:
Security Threat

Status:
ACTIVE
```

Telegram is only used for demo purposes.

Future production versions will replace Telegram with:

* SMS
* Firebase Push Notification
* LGU Integration
* Emergency Operations Center
* Dedicated Mobile App

---

# Incident Status

Possible values

```
ACTIVE

ACKNOWLEDGED

RESPONDING

RESOLVED
```

Every status update creates a timeline event.

---

# API

POST

```
/api/incidents
```

Creates incident.

Updates database.

Creates timeline.

Sends Telegram notification.

Returns incident.

---

PATCH

```
/api/incidents/:id/status
```

Updates

```
ACTIVE

ACKNOWLEDGED

RESPONDING

RESOLVED
```

Creates timeline entry.

---

# UI

Emergency

Bright Red

```
#EF4444
```

Responding

Amber

```
#F59E0B
```

Resolved

Green

```
#22C55E
```

Background

Dark Gray

Cards

Rounded

Soft Shadow

Modern

---

# Future Hardware

Current Demo

```
Teacher clicks web button
```

Future

```
Teacher presses physical emergency button

↓

ESP32

↓

POST /api/incidents

↓

Same backend
```

No backend changes should be required when replacing the web button with a physical emergency button.

---

# Future Roadmap

Phase 2

* ESP32 Physical Button
* Local School Server
* Offline Mode

Phase 3

* SMS
* Push Notifications
* Parent Alerts
* School Maps

Phase 4

* LGU Integration
* Police Integration
* Fire Department Integration
* Medical Emergency Integration

---

# Success Criteria

The demo is considered successful if:

✅ Teacher clicks emergency button

✅ Incident is created

✅ Dashboard updates instantly

✅ Telegram notification is received on a mobile phone

✅ Timeline records every action

✅ Admin can acknowledge, respond, and resolve the incident

The demo should feel like a real emergency response platform even though the trigger is currently a web button.
