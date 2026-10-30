# WASSLHA - Four apps map (how they stay stitched together)

Goal: customer app, rider app, merchant dashboard and admin dashboard behave as four views of ONE order lifecycle,
so nothing gets stuck between them (like the merchant step that blocked every test order).

## 1. Rules that prevent gaps

1. **One owner per transition.** A status changes through exactly one DB function, called by exactly one actor
   (customer, merchant, rider, system cron or admin). No app writes a status any other way.
2. **The database is the authority.** Apps only show the status; labels come from one shared list (`packages/`).
3. **Every transition has a "who gets told".** Merchant new order, rider new offer, customer each step, admin exceptions.
4. **Every waiting state has a timeout.** Pending merchant confirmation, offer to rider, unpaid online order, ...
   a state that nobody answers must move on by itself (cancel / re-offer / alert admin).
5. **Every phase ends with the same end-to-end check** (section 4) run by hand on real phones.

## 2. The order lifecycle: owner of each step and where it stands

| Step | Owner | State today |
|------|-------|-------------|
| Place order (COD) | Customer app | Works |
| Create the delivery row | DB trigger | Works (added 2026-10-27) |
| Accept -> preparing -> ready_for_pickup | **Merchant** | Dashboard built, **not deployed**; no new-order alert; no timeout |
| Offer to a rider (60-120 s) | System (cron every minute) | Works; needs rider online + slot + fresh GPS |
| Accept -> pickup -> in transit -> delivered | Rider app | Works; offer notification works with the app closed |
| Rider goes offline when GPS stops | System (cron) | Works (added 2026-10-29) |
| Cash handover rider -> platform | **Admin** (FinanceOps) | Built, never tested end to end |
| Merchant settlement | **Admin** | Built, never tested end to end |
| Sub-order status after delivery | System | Stays `ready_for_pickup` - to verify (settlement depends on it) |
| Customer notified at each step | System | **Missing** |
| "Jib liya" (get requests) | Customer + rider + admin | Customer side only; no rider/admin side at all |
| Support / complaints / ratings | All | Admin read-only list; nothing in customer/rider/merchant |

## 3. Phases

**A - Close the loop (now).** Deploy the merchant dashboard (phone login added), run the check in section 4 with friends.
Exit: 10 consecutive orders delivered with no manual database help.

**B - Merchant (partner app style).**
- New-order alert with sound (browser notification + repeating sound) and a visible "waiting for you" counter.
- Accept with preparation time, or reject with a reason; auto-reject after a timeout (value from `admin_settings`).
- Order detail: items, customer note, COD amount, delivery address.
- Quick pause store / opening hours (API `stores/:id/operations` already exists), quick product availability toggle.
- History + earnings per day; Arabic labels for statuses.

**C - Admin (operations control tower, not only tables).**
- Live map (OSM): online riders, active deliveries, waiting orders.
- Dispatch board: unassigned orders, manual assign / re-assign (API route exists, no UI).
- Approval queues: merchants, riders, products (statuses exist, no actions in the UI).
- Cash desk: handovers; settlements; refunds; ticket handling; enable / disable users.
- Admin login with email + password + MFA needs a real admin account (the test account is phone only).

**D - Glue between the apps.** Status notifications to the customer; tracking screen; ratings; "Jib liya" end to end
(rider sees open requests, makes an offer, customer accepts, purchase + receipt); realtime instead of polling.

**E - Production.** Real SMS, privacy policy, Play Store, online payments, monitoring and backups.

## 4. End-to-end check (run after every phase)

1. Customer places a COD order from the test store.
2. Merchant dashboard shows it within 10 s and rings; merchant accepts -> preparing -> ready.
3. Rider (online, slot, GPS) gets a notification within 1 minute, accepts, picks up, delivers, cash collected.
4. Customer sees every status change. Admin sees the order, the delivery and the rider on the map.
5. Rider hands cash to admin; admin records it; merchant settlement shows the right net amount.
6. Repeat with: merchant ignores the order (timeout), rider ignores the offer (re-offer), customer cancels.

## 5. Known open problems found while testing (2026-10)

- Sub-order status is not updated to delivered.
- 12 old test orders are stuck in `pending`.
- API: nothing sends a customer notification; merchants have no alert.
- Offers last 120 s (cron) but the re-offer path in `dispatch_auto_offer_delivery` uses 60 s - align them.
