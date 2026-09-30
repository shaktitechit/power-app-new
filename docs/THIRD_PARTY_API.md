# Power App Third-Party Integration API Documentation

This document provides complete instructions and API references for integrating third-party applications (CRM, ERP, partner portals, mobile clients) with the Power App platform to access **Enquiries** and **Facilities** data.

---

## Table of Contents
1. [Overview](#1-overview)
2. [Authentication & Security](#2-authentication--security)
3. [Base URLs & Environment](#3-base-urls--environment)
4. [Enquiries API](#4-enquiries-api)
   - [List Enquiries](#get-apiv1externalenquiries)
   - [Get Enquiry by ID or Number](#get-apiv1externalenquiriesid)
5. [Facilities API](#5-facilities-api)
   - [List Facilities](#get-apiv1externalfacilities)
   - [Get Facility by ID or Number](#get-apiv1externalfacilitiesid)
6. [Admin API Key Management](#6-admin-api-key-management)
7. [Postman Setup & Collection](#7-postman-setup--collection)
8. [Code Examples (Node.js, Python, cURL)](#8-code-examples)
9. [Error Codes & Responses](#9-error-codes--responses)

---

## 1. Overview

The External Third-Party API provides secure, token-based, read-only access to Enquiries and Facilities records.

* **Protocol**: HTTPS / HTTP
* **Data Format**: `application/json`
* **Authentication**: API Key (`x-api-key` header or `Authorization: Bearer <key>`)
* **Standard Response Envelope**:
  ```json
  {
    "success": true,
    "pagination": {
      "total": 32,
      "page": 1,
      "limit": 20,
      "totalPages": 2
    },
    "data": [ ... ]
  }
  ```

---

## 2. Authentication & Security

External API requests require an active API key with valid scopes.

### Header Options
Pass your key in either of the following HTTP headers:

```http
x-api-key: spl_live_7a5e286b6e27eaad0316dd3bdcc8d6b48e81b6ef8b7ad743
```
*or*
```http
Authorization: Bearer spl_live_7a5e286b6e27eaad0316dd3bdcc8d6b48e81b6ef8b7ad743
```

### Supported Scopes
- `enquiries:read` — Access enquiry endpoints
- `facilities:read` — Access facility endpoints
- `all:read` / `*` — Unrestricted read access

---

## 3. Base URLs & Environment

| Environment | Base URL |
| :--- | :--- |
| **Local Development** | `http://localhost:5000` |
| **Production Server** | `https://power.spspl.com` *(or your configured server domain)* |

---

## 4. Enquiries API

### `GET /api/v1/external/enquiries`
Retrieve a paginated list of enquiries with filtering and search capabilities.

**Required Scope:** `enquiries:read`

#### Query Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `page` | `number` | `1` | Page number for pagination |
| `limit` | `number` | `20` | Items per page (max `100`) |
| `search` | `string` | — | Text search across `name`, `enquiry_number`, `client_email`, `client_contact_number`, `city` |
| `status` | `string` | — | Filter by enquiry status (`new`, `assigned`, `follow_up`, `quoted`, `won`, `lost`, `dropped`, etc.) |
| `city` | `string` | — | Case-insensitive city name filter |
| `audit_type` | `string` | — | Filter by requested audit type (e.g. `Electrical Energy Audit`, `Electrical Safety Audit`, `Thermal Audit`, `Lightning Arrester Audit`) |
| `is_converted` | `boolean` | — | Filter by conversion state (`true` / `false`) |
| `startDate` | `date` | — | ISO Date string (`YYYY-MM-DD`) filter for creation date (from) |
| `endDate` | `date` | — | ISO Date string (`YYYY-MM-DD`) filter for creation date (to) |
| `sortBy` | `string` | `created_at` | Field name to sort by |
| `sortOrder` | `string` | `desc` | `asc` or `desc` |

#### Sample Request
```bash
curl -X GET "http://localhost:5000/api/v1/external/enquiries?page=1&limit=10&status=won" \
  -H "x-api-key: spl_live_7a5e286b6e27eaad0316dd3bdcc8d6b48e81b6ef8b7ad743"
```

#### Sample Response
```json
{
  "success": true,
  "pagination": {
    "total": 32,
    "page": 1,
    "limit": 10,
    "totalPages": 4
  },
  "data": [
    {
      "id": "6a38cc219e3d402ea1369447",
      "enquiry_number": "ENQ-SPL/20260622/001",
      "name": "Cantonment Board - Shahjahanpur",
      "city": "Shahjahanpur",
      "address": "Military Camp Area, Shahjahanpur",
      "client_representative": "Col. Sharma",
      "client_contact_number": "9876543210",
      "client_email": "sharma@cantonment.gov.in",
      "client_representatives": [
        {
          "name": "Col. Sharma",
          "contact_number": "9876543210",
          "email": "sharma@cantonment.gov.in"
        }
      ],
      "enquiry_status": "won",
      "source": "Tender Portal",
      "expected_value": 250000,
      "requested_audit_types": [
        "Electrical Energy Audit"
      ],
      "requested_audits": [
        {
          "audit_type": "Electrical Energy Audit",
          "expected_value": 250000
        }
      ],
      "notes": "Annual electrical audit mandate",
      "next_followup_date": null,
      "is_converted_to_facility": true,
      "converted_facility": {
        "id": "6a99a8ee09efbb90ac73a627",
        "name": "CB Shahjahanpur Main Campus",
        "audit_number": "SPL/20260903/003",
        "status": "active",
        "city": "Shahjahanpur"
      },
      "assigned_to": {
        "id": "6511234567890abcdef12345",
        "name": "Lead Auditor",
        "email": "auditor@spspl.com"
      },
      "created_at": "2026-06-22T09:30:00.000Z",
      "updated_at": "2026-06-25T14:20:00.000Z"
    }
  ]
}
```

---

### `GET /api/v1/external/enquiries/:id`
Retrieve details of a single enquiry by MongoDB ID or `enquiry_number`.

**Required Scope:** `enquiries:read`

#### URL Parameters
- `id` — MongoDB ObjectId (e.g. `6a38cc219e3d402ea1369447`) OR Enquiry Number (e.g. `ENQ-SPL/20260622/001`)

#### Sample Request
```bash
curl -X GET "http://localhost:5000/api/v1/external/enquiries/ENQ-SPL/20260622/001" \
  -H "x-api-key: spl_live_7a5e286b6e27eaad0316dd3bdcc8d6b48e81b6ef8b7ad743"
```

#### Sample Response
```json
{
  "success": true,
  "data": {
    "id": "6a38cc219e3d402ea1369447",
    "enquiry_number": "ENQ-SPL/20260622/001",
    "name": "Cantonment Board - Shahjahanpur",
    "city": "Shahjahanpur",
    "address": "Military Camp Area, Shahjahanpur",
    "client_representative": "Col. Sharma",
    "client_contact_number": "9876543210",
    "client_email": "sharma@cantonment.gov.in",
    "client_representatives": [],
    "enquiry_status": "won",
    "source": "Tender Portal",
    "expected_value": 250000,
    "requested_audit_types": ["Electrical Energy Audit"],
    "requested_audits": [
      {
        "audit_type": "Electrical Energy Audit",
        "expected_value": 250000
      }
    ],
    "notes": "Annual electrical audit mandate",
    "next_followup_date": null,
    "is_converted_to_facility": true,
    "converted_facility": {
      "_id": "6a99a8ee09efbb90ac73a627",
      "name": "CB Shahjahanpur Main Campus",
      "audit_number": "SPL/20260903/003",
      "status": "active",
      "city": "Shahjahanpur",
      "facility_type": "Commercial",
      "start_date": "2026-09-03T00:00:00.000Z"
    },
    "accepted_quotation": null,
    "assigned_to": {
      "id": "6511234567890abcdef12345",
      "name": "Lead Auditor",
      "email": "auditor@spspl.com"
    },
    "metrics": {
      "follow_ups_count": 3,
      "documents_count": 2,
      "latest_follow_up": {
        "id": "6a38cc219e3d402ea1369888",
        "status": "won",
        "notes": "Contract signed and finalized",
        "follow_up_date": "2026-06-24T10:00:00.000Z",
        "next_followup_date": null
      }
    },
    "created_at": "2026-06-22T09:30:00.000Z",
    "updated_at": "2026-06-25T14:20:00.000Z"
  }
}
```

---

## 5. Facilities API

### `GET /api/v1/external/facilities`
Retrieve a paginated list of audit facilities with assigned auditors.

**Required Scope:** `facilities:read`

#### Query Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `page` | `number` | `1` | Page number for pagination |
| `limit` | `number` | `20` | Items per page (max `100`) |
| `search` | `string` | — | Text search across `name`, `audit_number`, `enquiry_number`, `client_email`, `client_contact_number`, `city` |
| `status` | `string` | — | Filter by status (`active` or `inactive`) |
| `city` | `string` | — | Case-insensitive city name filter |
| `audit_type` | `string` | — | Filter by audit type (`Electrical Energy Audit`, `Electrical Safety Audit`, `Thermal Audit`, `Lightning Arrester Audit`) |
| `facility_type` | `string` | — | Type of facility (e.g. `Commercial`, `Industrial`, `Hospital`, etc.) |
| `startDate` | `date` | — | ISO Date string (`YYYY-MM-DD`) filter for audit start date (from) |
| `endDate` | `date` | — | ISO Date string (`YYYY-MM-DD`) filter for audit start date (to) |
| `sortBy` | `string` | `start_date` | Field name to sort by |
| `sortOrder` | `string` | `desc` | `asc` or `desc` |

#### Sample Request
```bash
curl -X GET "http://localhost:5000/api/v1/external/facilities?limit=5&status=active" \
  -H "x-api-key: spl_live_7a5e286b6e27eaad0316dd3bdcc8d6b48e81b6ef8b7ad743"
```

#### Sample Response
```json
{
  "success": true,
  "pagination": {
    "total": 34,
    "page": 1,
    "limit": 5,
    "totalPages": 7
  },
  "data": [
    {
      "id": "6a99a8ee09efbb90ac73a627",
      "audit_number": "SPL/20260903/003",
      "enquiry_number": "ENQ-SPL/20260622/001",
      "name": "CB Lucknow",
      "city": "Lucknow",
      "address": "MG Road, Cantt, Lucknow",
      "client_representative": "R. K. Verma",
      "client_contact_number": "9898989898",
      "client_email": "rkverma@lucknowcantt.org",
      "client_representatives": [],
      "facility_type": "Government Office",
      "audit_type": "Electrical Energy Audit",
      "status": "active",
      "start_date": "2026-09-03T00:00:00.000Z",
      "closure_date": null,
      "expected_value": 300000,
      "budget": {
        "no_of_persons": 3,
        "no_planned_site_visits": 2,
        "tentative_budget": 50000,
        "actual_budget": 42000
      },
      "audit_closure": {
        "is_closed": false
      },
      "assigned_auditors": [
        {
          "id": "6511234567890abcdef12345",
          "name": "Audit Lead",
          "email": "lead@spspl.com",
          "assigned_role": "Auditor"
        }
      ],
      "created_at": "2026-09-03T05:30:00.000Z",
      "updated_at": "2026-09-10T12:00:00.000Z"
    }
  ]
}
```

---

### `GET /api/v1/external/facilities/:id`
Retrieve details of a single facility by MongoDB ID or `audit_number`.

**Required Scope:** `facilities:read`

#### URL Parameters
- `id` — MongoDB ObjectId OR Audit Number (e.g. `SPL/20260903/003`)

#### Sample Request
```bash
curl -X GET "http://localhost:5000/api/v1/external/facilities/SPL/20260903/003" \
  -H "x-api-key: spl_live_7a5e286b6e27eaad0316dd3bdcc8d6b48e81b6ef8b7ad743"
```

---

## 6. Admin API Key Management

Admins can issue, inspect, and revoke API credentials.

| Method | Endpoint | Description | Authentication |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/admin/api-keys` | Generate a new API Key | Admin JWT Auth |
| `GET` | `/api/v1/admin/api-keys` | List all API Keys | Admin JWT Auth |
| `PATCH` | `/api/v1/admin/api-keys/:id/status` | Update key status (`active`, `revoked`, `inactive`) | Admin JWT Auth |
| `DELETE` | `/api/v1/admin/api-keys/:id` | Delete (soft delete) an API Key | Admin JWT Auth |

#### Generating a Key via CLI
From the backend directory:
```bash
node src/scripts/generateApiKey.js --name "Mobile CRM Client" --scopes "enquiries:read,facilities:read" --desc "Integration key for CRM"
```

---

## 7. Postman Setup & Collection

A ready-to-import Postman collection is located at [`docs/PowerApp_External_API.postman_collection.json`](file:///Users/macbook/Desktop/power-app-main/docs/PowerApp_External_API.postman_collection.json).

### Steps to Import:
1. Open **Postman**.
2. Click the **Import** button in the top left.
3. Drag and drop `docs/PowerApp_External_API.postman_collection.json` (or paste the raw JSON).
4. The collection will automatically populate the pre-configured requests and collection-level `apiKey` variable.

---

## 8. Code Examples

### Node.js (Axios)
```javascript
import axios from "axios";

const API_KEY = "spl_live_7a5e286b6e27eaad0316dd3bdcc8d6b48e81b6ef8b7ad743";
const client = axios.create({
  baseURL: "http://localhost:5000/api/v1/external",
  headers: {
    "x-api-key": API_KEY,
  },
});

async function fetchEnquiriesAndFacilities() {
  try {
    // 1. Fetch Enquiries
    const enquiriesRes = await client.get("/enquiries", {
      params: { limit: 10, status: "won" },
    });
    console.log("Enquiries count:", enquiriesRes.data.pagination.total);

    // 2. Fetch Facilities
    const facilitiesRes = await client.get("/facilities", {
      params: { limit: 10, status: "active" },
    });
    console.log("Facilities count:", facilitiesRes.data.pagination.total);
  } catch (error) {
    console.error("API Error:", error.response?.data || error.message);
  }
}

fetchEnquiriesAndFacilities();
```

### Python (Requests)
```python
import requests

API_KEY = "spl_live_7a5e286b6e27eaad0316dd3bdcc8d6b48e81b6ef8b7ad743"
BASE_URL = "http://localhost:5000/api/v1/external"

headers = {
    "x-api-key": API_KEY
}

# Fetch Enquiries
response = requests.get(f"{BASE_URL}/enquiries", headers=headers, params={"limit": 10})
if response.status_code == 200:
    data = response.json()
    print(f"Total Enquiries: {data['pagination']['total']}")
else:
    print(f"Error {response.status_code}: {response.text}")
```

---

## 9. Error Codes & Responses

| Status Code | Error Message | Reason / Fix |
| :--- | :--- | :--- |
| `401 Unauthorized` | `API key is required.` | Missing `x-api-key` or `Authorization` header. |
| `401 Unauthorized` | `Invalid API key.` | Provided API key does not match any record. |
| `403 Forbidden` | `API key is inactive or has been revoked (revoked).` | Key status was revoked by an administrator. |
| `403 Forbidden` | `API key has expired.` | The expiration timestamp has passed. |
| `403 Forbidden` | `Forbidden: API key lacks required scope [enquiries:read].` | Key lacks the necessary permissions. |
| `404 Not Found` | `Enquiry not found` / `Facility not found` | The requested resource ID or number does not exist. |
| `500 Server Error` | `Internal server error` | Unexpected server failure. |
