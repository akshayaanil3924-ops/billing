# Fertilizer Billing Software

## Overview

Fertilizer Billing Software is a desktop-based billing and inventory management application developed for fertilizer shops. The system provides a centralized solution for managing fertilizer products, generating invoices, maintaining stock, viewing sales reports, calculating profit, and backing up or restoring application data.

The application is developed using **Electron.js**, **JavaScript**, **HTML**, **CSS**, and **SQLite**. The database is stored locally, allowing the application to operate without requiring an external database server.

## Features

### 1. Billing Management

* Select products from the available inventory.
* Enter the required quantity.
* Add multiple products to a billing cart.
* Automatically calculate GST.
* Calculate the total invoice amount.
* Generate unique invoice numbers.
* Save invoices and maintain invoice history.
* Automatically update stock after a sale.

### 2. Product Management

* Add new fertilizer products.
* Maintain product names and HSN codes.
* Store GST percentages.
* Maintain purchase and selling prices.
* Manage available stock quantities.
* View the current product inventory.

### 3. Reports

* Generate daily sales reports.
* Generate monthly sales reports.
* Filter sales according to the selected month.
* Generate profit reports based on purchase and selling prices.

### 4. Backup and Restore

* Create a backup of the local database.
* Restore previously backed-up database information.
* Provide basic protection against data loss.

## Technology Stack

| Technology  | Purpose                       |
| ----------- | ----------------------------- |
| Electron.js | Desktop application framework |
| JavaScript  | Application logic             |
| HTML5       | User interface                |
| CSS3        | Interface styling             |
| SQLite3     | Local database                |
| Node.js     | JavaScript runtime            |
| npm         | Dependency management         |

The project is configured as an Electron application and uses SQLite3 as its database dependency.

## System Requirements

* Windows, macOS, or Linux
* Node.js
* npm
* Git

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/akshayaanil3924-ops/billing.git
```

### 2. Navigate to the Project Directory

```bash
cd fertilizer-billing
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start the Application

```bash
npm start
```

The project uses the Electron start script defined in `package.json`.

## Project Structure

```text
fertilizer-billing/
│
├── main.js
├── index.html
├── package.json
├── package-lock.json
├── database.sqlite
└── README.md
```

## Application Modules

### Billing

The Billing module allows the user to select products, enter quantities, add items to a cart, calculate GST and generate invoices. The application also checks product availability before completing a sale.

### Products

The Products module allows the user to add fertilizer products with their name, HSN code, GST percentage, purchase price, selling price and available quantity.

### Reports

The Reports module provides daily sales, monthly sales and profit reports.

### Backup and Restore

The Backup and Restore module provides options for backing up and restoring the application's local database.

## Database

The application uses **SQLite3** for local data storage.

The database stores information related to:

* Products
* Product stock
* HSN codes
* GST
* Purchase prices
* Selling prices
* Invoices
* Invoice items

The application creates and accesses the local SQLite database from the Electron application.

## Invoice Generation

Invoices are automatically assigned a unique invoice number based on the current year.

Example:

```text
INV-2026-001
INV-2026-002
INV-2026-003
```

The system saves invoice information and associated invoice items in the database.

## Purpose

This project is intended to provide a simple and efficient computerized solution for fertilizer shop billing and inventory management while reducing manual record keeping.
