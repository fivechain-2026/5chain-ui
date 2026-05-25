export const mockOrders = [
  { id: '1', order_no: 'ORD-2025-001', customer_name: 'Reliance Retail Ltd',    status: 'processing', created_at: '2025-05-20T09:12:00Z' },
  { id: '2', order_no: 'ORD-2025-002', customer_name: 'DMart Stores',           status: 'created',    created_at: '2025-05-21T11:30:00Z' },
  { id: '3', order_no: 'ORD-2025-003', customer_name: 'Flipkart Wholesale',     status: 'picked',     created_at: '2025-05-22T08:45:00Z' },
  { id: '4', order_no: 'ORD-2025-004', customer_name: 'Spencer\'s Retail',      status: 'packed',     created_at: '2025-05-22T14:00:00Z' },
  { id: '5', order_no: 'ORD-2025-005', customer_name: 'Amazon Seller Services', status: 'dispatched', created_at: '2025-05-19T07:20:00Z' },
  { id: '6', order_no: 'ORD-2025-006', customer_name: 'Big Bazaar',             status: 'created',    created_at: '2025-05-23T10:05:00Z' },
  { id: '7', order_no: 'ORD-2025-007', customer_name: 'Meesho Logistics',       status: 'processing', created_at: '2025-05-23T13:15:00Z' },
  { id: '8', order_no: 'ORD-2025-008', customer_name: 'Nykaa Commerce',         status: 'cancelled',  created_at: '2025-05-18T16:40:00Z' },
];

export const mockShipments = [
  { id: 's1', order_id: '5', tracking_no: 'DTDC9823741IN', carrier: 'DTDC',       status: 'in_transit', dispatched_at: '2025-05-20T06:00:00Z', delivered_at: null },
  { id: 's2', order_id: '1', tracking_no: 'BD00123456IN',  carrier: 'BlueDart',    status: 'in_transit', dispatched_at: '2025-05-21T08:30:00Z', delivered_at: null },
  { id: 's3', order_id: '2', tracking_no: 'DEL7654321IN',  carrier: 'Delhivery',   status: 'dispatched', dispatched_at: '2025-05-22T10:00:00Z', delivered_at: null },
  { id: 's4', order_id: '8', tracking_no: null,            carrier: 'Ecom Express', status: 'delivered',  dispatched_at: '2025-05-15T09:00:00Z', delivered_at: '2025-05-18T14:30:00Z' },
  { id: 's5', order_id: '3', tracking_no: 'XPR4412233IN',  carrier: 'XpressBees',  status: 'created',    dispatched_at: null,                   delivered_at: null },
];

export const mockTenants = [
  { id: 't1', name: 'Nestlé India Ltd',    gstin: '27AAACN2ND1Z5',  contact_email: 'ops@nestle.in'    },
  { id: 't2', name: 'Hindustan Unilever',  gstin: '27AAACH0L61Z7',  contact_email: 'supply@hul.co.in' },
  { id: 't3', name: 'ITC Limited',         gstin: '27AAACI1234Z8',  contact_email: 'wms@itc.in'       },
];

export const mockWarehouses = [
  { id: 'w1', name: 'Mumbai Central WH',  city: 'Mumbai',    state: 'Maharashtra' },
  { id: 'w2', name: 'Delhi NCR Facility', city: 'Gurugram',  state: 'Haryana'     },
  { id: 'w3', name: 'Bengaluru Hub',      city: 'Bengaluru', state: 'Karnataka'   },
];

export const mockInventorySummary = {
  totalQty: 48320,
};
