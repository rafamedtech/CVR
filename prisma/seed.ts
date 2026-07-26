import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import {
  ExpenseCategory,
  LineItemType,
  OrderPriority,
  OrderStatus,
  PaymentMethod,
  PrismaClient,
  WorkshopType
} from '../generated/prisma/client'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL es obligatoria para ejecutar el seed.')
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString })
})

const ids = {
  customers: {
    bodyOne: '20000000-0000-4000-8000-000000000001',
    bodyTwo: '20000000-0000-4000-8000-000000000002',
    bodyThree: '20000000-0000-4000-8000-000000000003',
    bodyFour: '20000000-0000-4000-8000-000000000004',
    mechanicalOne: '20000000-0000-4000-8000-000000000005',
    mechanicalTwo: '20000000-0000-4000-8000-000000000006',
    mechanicalThree: '20000000-0000-4000-8000-000000000007',
    mechanicalFour: '20000000-0000-4000-8000-000000000008'
  },
  vehicles: {
    bodyOne: '30000000-0000-4000-8000-000000000001',
    bodyTwo: '30000000-0000-4000-8000-000000000002',
    bodyThree: '30000000-0000-4000-8000-000000000003',
    bodyFour: '30000000-0000-4000-8000-000000000004',
    mechanicalOne: '30000000-0000-4000-8000-000000000005',
    mechanicalTwo: '30000000-0000-4000-8000-000000000006',
    mechanicalThree: '30000000-0000-4000-8000-000000000007',
    mechanicalFour: '30000000-0000-4000-8000-000000000008'
  },
  orders: {
    bodyEstimate: '40000000-0000-4000-8000-000000000001',
    bodyAwaiting: '40000000-0000-4000-8000-000000000002',
    bodyQuality: '40000000-0000-4000-8000-000000000003',
    bodyCancelled: '40000000-0000-4000-8000-000000000004',
    bodyDeliveredHistory: '40000000-0000-4000-8000-000000000005',
    mechanicalApproved: '40000000-0000-4000-8000-000000000006',
    mechanicalProgress: '40000000-0000-4000-8000-000000000007',
    mechanicalReady: '40000000-0000-4000-8000-000000000008',
    mechanicalDelivered: '40000000-0000-4000-8000-000000000009',
    mechanicalDeliveredHistory: '40000000-0000-4000-8000-000000000010'
  }
} as const

const now = new Date()
const thisMonth = (day: number, hour = 10) => new Date(
  now.getFullYear(),
  now.getMonth(),
  Math.min(day, now.getDate()),
  hour
)
const previousMonth = (day: number, hour = 10) => new Date(
  now.getFullYear(),
  now.getMonth() - 1,
  day,
  hour
)
const futureDate = (days: number, hour = 17) => {
  const date = new Date(now)
  date.setDate(date.getDate() + days)
  date.setHours(hour, 0, 0, 0)
  return date
}

interface DemoItem {
  type: LineItemType
  description: string
  quantity: number
  unitCost: number
  unitPrice: number
  discount?: number
  taxRate?: number
}

interface DemoPayment {
  method: PaymentMethod
  ratio: number
  reference?: string
  notes?: string
  paidAt: Date
  recordedById: string
}

interface DemoOrder {
  id: string
  workshopId: string
  customerId: string
  vehicleId: string
  orderNumber: string
  status: OrderStatus
  priority: OrderPriority
  complaint: string
  diagnosis?: string
  intakeNotes?: string
  internalNotes?: string
  mileageIn: number
  fuelLevelIn: number
  promisedAt?: Date
  approvedAt?: Date
  startedAt?: Date
  completedAt?: Date
  deliveredAt?: Date
  createdAt: Date
  createdById: string
  assignedToId?: string
  items: DemoItem[]
  payments?: DemoPayment[]
}

function calculateItem(item: DemoItem) {
  const discount = item.discount ?? 0
  const taxRate = item.taxRate ?? 16
  const subtotal = Math.max(0, item.quantity * item.unitPrice - discount)
  const taxTotal = subtotal * taxRate / 100

  return {
    type: item.type,
    description: item.description,
    quantity: item.quantity,
    unitCost: item.unitCost,
    unitPrice: item.unitPrice,
    discount,
    taxRate,
    subtotal,
    taxTotal,
    total: subtotal + taxTotal,
    totalCost: item.quantity * item.unitCost
  }
}

async function upsertDemoOrder(seed: DemoOrder) {
  const items = seed.items.map(calculateItem)
  const totals = items.reduce((result, item) => ({
    subtotal: result.subtotal + item.subtotal,
    discountTotal: result.discountTotal + item.discount,
    taxTotal: result.taxTotal + item.taxTotal,
    total: result.total + item.total
  }), {
    subtotal: 0,
    discountTotal: 0,
    taxTotal: 0,
    total: 0
  })
  const orderData = {
    customerId: seed.customerId,
    vehicleId: seed.vehicleId,
    status: seed.status,
    priority: seed.priority,
    complaint: seed.complaint,
    diagnosis: seed.diagnosis ?? null,
    intakeNotes: seed.intakeNotes ?? null,
    internalNotes: seed.internalNotes ?? null,
    mileageIn: seed.mileageIn,
    fuelLevelIn: seed.fuelLevelIn,
    promisedAt: seed.promisedAt ?? null,
    approvedAt: seed.approvedAt ?? null,
    startedAt: seed.startedAt ?? null,
    completedAt: seed.completedAt ?? null,
    deliveredAt: seed.deliveredAt ?? null,
    createdById: seed.createdById,
    assignedToId: seed.assignedToId ?? null,
    createdAt: seed.createdAt,
    ...totals
  }
  const order = await prisma.serviceOrder.upsert({
    where: {
      workshopId_orderNumber: {
        workshopId: seed.workshopId,
        orderNumber: seed.orderNumber
      }
    },
    update: orderData,
    create: {
      id: seed.id,
      workshopId: seed.workshopId,
      orderNumber: seed.orderNumber,
      ...orderData
    }
  })

  // Sólo reemplaza conceptos y pagos de órdenes DEMO para mantener el seed repetible.
  await prisma.orderItem.deleteMany({ where: { orderId: order.id } })
  if (items.length) {
    await prisma.orderItem.createMany({
      data: items.map(item => ({
        orderId: order.id,
        ...item
      }))
    })
  }

  await prisma.payment.deleteMany({ where: { orderId: order.id } })
  if (seed.payments?.length) {
    await prisma.payment.createMany({
      data: seed.payments.map((payment, index) => ({
        orderId: order.id,
        amount: Math.round(totals.total * payment.ratio * 100) / 100,
        method: payment.method,
        reference: payment.reference ?? `DEMO-${seed.orderNumber}-${index + 1}`,
        notes: payment.notes ?? 'Pago de muestra',
        paidAt: payment.paidAt,
        recordedById: payment.recordedById
      }))
    })
  }
}

async function main() {
  const superAdmin = await prisma.profile.findFirst({
    where: { isSuperAdmin: true, active: true },
    orderBy: { createdAt: 'asc' }
  })

  if (!superAdmin) {
    throw new Error(
      'Inicia sesión una vez con BOOTSTRAP_ADMIN_EMAIL antes de cargar los datos de muestra.'
    )
  }

  const [bodyWorkshop, mechanicalWorkshop] = await Promise.all([
    prisma.workshop.upsert({
      where: { slug: 'carroceria' },
      update: {
        name: 'Taller de Carrocería',
        type: WorkshopType.BODY_SHOP,
        phone: '(664) 555-0101',
        address: 'Blvd. Industrial 1450, Tijuana, B.C.'
      },
      create: {
        slug: 'carroceria',
        name: 'Taller de Carrocería',
        type: WorkshopType.BODY_SHOP,
        phone: '(664) 555-0101',
        address: 'Blvd. Industrial 1450, Tijuana, B.C.'
      }
    }),
    prisma.workshop.upsert({
      where: { slug: 'mecanica' },
      update: {
        name: 'Taller Mecánico',
        type: WorkshopType.MECHANICAL,
        phone: '(664) 555-0202',
        address: 'Vía Rápida Poniente 820, Tijuana, B.C.'
      },
      create: {
        slug: 'mecanica',
        name: 'Taller Mecánico',
        type: WorkshopType.MECHANICAL,
        phone: '(664) 555-0202',
        address: 'Vía Rápida Poniente 820, Tijuana, B.C.'
      }
    })
  ])

  const customers = [
    {
      id: ids.customers.bodyOne,
      workshopId: bodyWorkshop.id,
      fullName: 'Alejandro Vargas',
      phone: '(664) 203-1148',
      alternatePhone: '(664) 331-7802',
      email: 'alejandro.vargas@example.com',
      taxId: 'VAAA850214KJ8',
      address: 'Col. Hipódromo, Tijuana, B.C.',
      notes: 'Prefiere actualizaciones por WhatsApp. Cliente recurrente.'
    },
    {
      id: ids.customers.bodyTwo,
      workshopId: bodyWorkshop.id,
      fullName: 'Transportes del Pacífico, S.A. de C.V.',
      phone: '(664) 608-4410',
      alternatePhone: null,
      email: 'flotilla@transportespacifico.example',
      taxId: 'TPA1906214R2',
      address: 'Otay Industrial, Tijuana, B.C.',
      notes: 'Crédito autorizado a 15 días. Solicitar orden de compra.'
    },
    {
      id: ids.customers.bodyThree,
      workshopId: bodyWorkshop.id,
      fullName: 'Fernanda Núñez',
      phone: '(664) 125-9083',
      alternatePhone: null,
      email: 'fernanda.nunez@example.com',
      taxId: null,
      address: 'Playas de Tijuana, B.C.',
      notes: 'Vehículo asegurado; enviar fotografías antes de trabajos adicionales.'
    },
    {
      id: ids.customers.bodyFour,
      workshopId: bodyWorkshop.id,
      fullName: 'Ricardo Salgado',
      phone: '(664) 790-2231',
      alternatePhone: null,
      email: null,
      taxId: null,
      address: null,
      notes: 'Cotización cancelada por decisión del cliente.'
    },
    {
      id: ids.customers.mechanicalOne,
      workshopId: mechanicalWorkshop.id,
      fullName: 'Gabriela Moreno',
      phone: '(664) 455-7812',
      alternatePhone: '(664) 901-2240',
      email: 'gabriela.moreno@example.com',
      taxId: 'MOGG910607PA3',
      address: 'Zona Río, Tijuana, B.C.',
      notes: 'Autoriza diagnósticos hasta $1,500 sin llamada previa.'
    },
    {
      id: ids.customers.mechanicalTwo,
      workshopId: mechanicalWorkshop.id,
      fullName: 'Cafeterías Baja Norte',
      phone: '(664) 312-6630',
      alternatePhone: null,
      email: 'administracion@cafeteriasbaja.example',
      taxId: 'CBN170902M81',
      address: 'Blvd. Agua Caliente, Tijuana, B.C.',
      notes: 'Unidad de reparto. Prioridad alta por operación diaria.'
    },
    {
      id: ids.customers.mechanicalThree,
      workshopId: mechanicalWorkshop.id,
      fullName: 'Óscar Medina',
      phone: '(664) 881-3479',
      alternatePhone: null,
      email: 'oscar.medina@example.com',
      taxId: null,
      address: 'La Mesa, Tijuana, B.C.',
      notes: 'Solicita conservar las piezas reemplazadas.'
    },
    {
      id: ids.customers.mechanicalFour,
      workshopId: mechanicalWorkshop.id,
      fullName: 'Laura Hernández',
      phone: '(664) 521-9066',
      alternatePhone: null,
      email: 'laura.hernandez@example.com',
      taxId: null,
      address: 'Santa Fe, Tijuana, B.C.',
      notes: 'Cliente recurrente; historial de servicios preventivos.'
    }
  ]

  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { id: customer.id },
      update: customer,
      create: customer
    })
  }

  const vehicles = [
    {
      id: ids.vehicles.bodyOne,
      workshopId: bodyWorkshop.id,
      customerId: ids.customers.bodyOne,
      vin: '3N1AB8AE7PY247811',
      licensePlate: 'CVR-B01',
      make: 'Nissan',
      model: 'Sentra',
      year: 2023,
      color: 'Blanco perla',
      mileage: 28450,
      fuelLevel: 55,
      notes: 'Golpe frontal derecho; faro funcional.'
    },
    {
      id: ids.vehicles.bodyTwo,
      workshopId: bodyWorkshop.id,
      customerId: ids.customers.bodyTwo,
      vin: '3GCNAAEK2NG185402',
      licensePlate: 'CVR-B02',
      make: 'Chevrolet',
      model: 'Silverado',
      year: 2022,
      color: 'Gris',
      mileage: 79120,
      fuelLevel: 30,
      notes: 'Unidad de flotilla 07.'
    },
    {
      id: ids.vehicles.bodyThree,
      workshopId: bodyWorkshop.id,
      customerId: ids.customers.bodyThree,
      vin: 'JM3KFBCM5M0321847',
      licensePlate: 'CVR-B03',
      make: 'Mazda',
      model: 'CX-5',
      year: 2021,
      color: 'Rojo',
      mileage: 46890,
      fuelLevel: 70,
      notes: 'Daño lateral cubierto por aseguradora.'
    },
    {
      id: ids.vehicles.bodyFour,
      workshopId: bodyWorkshop.id,
      customerId: ids.customers.bodyFour,
      vin: null,
      licensePlate: 'CVR-B04',
      make: 'Volkswagen',
      model: 'Jetta',
      year: 2018,
      color: 'Azul',
      mileage: 102300,
      fuelLevel: 45,
      notes: 'Sólo se realizó inspección visual.'
    },
    {
      id: ids.vehicles.mechanicalOne,
      workshopId: mechanicalWorkshop.id,
      customerId: ids.customers.mechanicalOne,
      vin: '1HGCV1F39LA026541',
      licensePlate: 'CVR-M01',
      make: 'Honda',
      model: 'Accord',
      year: 2020,
      color: 'Negro',
      mileage: 68340,
      fuelLevel: 60,
      notes: 'Testigo de motor encendido intermitentemente.'
    },
    {
      id: ids.vehicles.mechanicalTwo,
      workshopId: mechanicalWorkshop.id,
      customerId: ids.customers.mechanicalTwo,
      vin: 'MEX5G2600LT142803',
      licensePlate: 'CVR-M02',
      make: 'Nissan',
      model: 'NP300',
      year: 2020,
      color: 'Blanco',
      mileage: 148200,
      fuelLevel: 25,
      notes: 'Unidad de reparto; servicio urgente.'
    },
    {
      id: ids.vehicles.mechanicalThree,
      workshopId: mechanicalWorkshop.id,
      customerId: ids.customers.mechanicalThree,
      vin: '3VW2K7AJ7KM109642',
      licensePlate: 'CVR-M03',
      make: 'Volkswagen',
      model: 'Jetta',
      year: 2019,
      color: 'Plata',
      mileage: 93410,
      fuelLevel: 80,
      notes: 'Ruido en suspensión delantera.'
    },
    {
      id: ids.vehicles.mechanicalFour,
      workshopId: mechanicalWorkshop.id,
      customerId: ids.customers.mechanicalFour,
      vin: 'KL8CD6SA7LC427103',
      licensePlate: 'CVR-M04',
      make: 'Chevrolet',
      model: 'Spark',
      year: 2020,
      color: 'Rojo',
      mileage: 57200,
      fuelLevel: 50,
      notes: 'Historial de mantenimiento cada 10,000 km.'
    }
  ]

  for (const vehicle of vehicles) {
    await prisma.vehicle.upsert({
      where: { id: vehicle.id },
      update: vehicle,
      create: vehicle
    })
  }

  const orders: DemoOrder[] = [
    {
      id: ids.orders.bodyEstimate,
      workshopId: bodyWorkshop.id,
      customerId: ids.customers.bodyOne,
      vehicleId: ids.vehicles.bodyOne,
      orderNumber: 'DEMO-CAR-001',
      status: OrderStatus.ESTIMATE,
      priority: OrderPriority.NORMAL,
      complaint: 'Golpe en fascia y salpicadera delantera derecha.',
      diagnosis: 'Fascia reparable; salpicadera requiere alineación y pintura.',
      intakeNotes: 'Se recibieron llave y tarjeta de circulación. Fotografías registradas.',
      internalNotes: 'Validar disponibilidad de grapas antes de autorizar.',
      mileageIn: 28450,
      fuelLevelIn: 55,
      promisedAt: futureDate(5),
      createdAt: thisMonth(3, 9),
      createdById: superAdmin.id,
      items: [
        {
          type: LineItemType.SERVICE,
          description: 'Diagnóstico y desmontaje inicial',
          quantity: 1,
          unitCost: 250,
          unitPrice: 650
        },
        {
          type: LineItemType.PART,
          description: 'Juego de grapas para fascia',
          quantity: 1,
          unitCost: 380,
          unitPrice: 720
        },
        {
          type: LineItemType.LABOR,
          description: 'Reparación y alineación de salpicadera',
          quantity: 6,
          unitCost: 180,
          unitPrice: 420,
          discount: 250
        },
        {
          type: LineItemType.OTHER,
          description: 'Materiales de enmascarado y consumibles',
          quantity: 1,
          unitCost: 310,
          unitPrice: 580
        }
      ]
    },
    {
      id: ids.orders.bodyAwaiting,
      workshopId: bodyWorkshop.id,
      customerId: ids.customers.bodyTwo,
      vehicleId: ids.vehicles.bodyTwo,
      orderNumber: 'DEMO-CAR-002',
      status: OrderStatus.AWAITING_APPROVAL,
      priority: OrderPriority.HIGH,
      complaint: 'Daño en caja y defensa trasera por maniobra de carga.',
      diagnosis: 'Requiere cambio de defensa y reparación de costado derecho de caja.',
      intakeNotes: 'Unidad operativa; cliente solicita cotización desglosada.',
      internalNotes: 'Pendiente orden de compra del cliente.',
      mileageIn: 79120,
      fuelLevelIn: 30,
      promisedAt: futureDate(8),
      createdAt: thisMonth(6, 11),
      createdById: superAdmin.id,
      items: [
        {
          type: LineItemType.PART,
          description: 'Defensa trasera completa',
          quantity: 1,
          unitCost: 6850,
          unitPrice: 8950
        },
        {
          type: LineItemType.LABOR,
          description: 'Reparación de costado de caja',
          quantity: 14,
          unitCost: 190,
          unitPrice: 460
        },
        {
          type: LineItemType.SERVICE,
          description: 'Igualado y aplicación de pintura',
          quantity: 1,
          unitCost: 2850,
          unitPrice: 5200
        }
      ]
    },
    {
      id: ids.orders.bodyQuality,
      workshopId: bodyWorkshop.id,
      customerId: ids.customers.bodyThree,
      vehicleId: ids.vehicles.bodyThree,
      orderNumber: 'DEMO-CAR-003',
      status: OrderStatus.QUALITY_CONTROL,
      priority: OrderPriority.URGENT,
      complaint: 'Daño en ambas puertas del lado izquierdo.',
      diagnosis: 'Sustitución de puerta delantera y reparación de puerta trasera.',
      intakeNotes: 'Expediente de aseguradora recibido. Deducible pendiente.',
      internalNotes: 'Revisar tono bajo luz natural antes de liberar.',
      mileageIn: 46890,
      fuelLevelIn: 70,
      promisedAt: futureDate(2),
      approvedAt: thisMonth(5, 14),
      startedAt: thisMonth(7, 8),
      completedAt: thisMonth(16, 16),
      createdAt: thisMonth(4, 10),
      createdById: superAdmin.id,
      items: [
        {
          type: LineItemType.PART,
          description: 'Puerta delantera izquierda',
          quantity: 1,
          unitCost: 11200,
          unitPrice: 14650
        },
        {
          type: LineItemType.LABOR,
          description: 'Reparación de puerta trasera',
          quantity: 9,
          unitCost: 195,
          unitPrice: 475
        },
        {
          type: LineItemType.SERVICE,
          description: 'Pintura y difuminado lateral',
          quantity: 1,
          unitCost: 4900,
          unitPrice: 8350,
          discount: 500
        }
      ],
      payments: [
        {
          method: PaymentMethod.TRANSFER,
          ratio: 0.45,
          reference: 'SPEI-DEMO-3841',
          notes: 'Anticipo del deducible',
          paidAt: thisMonth(8, 13),
          recordedById: superAdmin.id
        }
      ]
    },
    {
      id: ids.orders.bodyCancelled,
      workshopId: bodyWorkshop.id,
      customerId: ids.customers.bodyFour,
      vehicleId: ids.vehicles.bodyFour,
      orderNumber: 'DEMO-CAR-004',
      status: OrderStatus.CANCELLED,
      priority: OrderPriority.NORMAL,
      complaint: 'Solicita cotización para repintado completo.',
      diagnosis: 'Pintura con daño solar; requiere preparación completa.',
      intakeNotes: 'Inspección realizada sin dejar el vehículo.',
      internalNotes: 'Cliente decidió posponer el trabajo.',
      mileageIn: 102300,
      fuelLevelIn: 45,
      createdAt: thisMonth(10, 15),
      createdById: superAdmin.id,
      items: [
        {
          type: LineItemType.SERVICE,
          description: 'Preparación y pintura exterior completa',
          quantity: 1,
          unitCost: 17800,
          unitPrice: 28900
        }
      ]
    },
    {
      id: ids.orders.bodyDeliveredHistory,
      workshopId: bodyWorkshop.id,
      customerId: ids.customers.bodyOne,
      vehicleId: ids.vehicles.bodyOne,
      orderNumber: 'DEMO-CAR-H01',
      status: OrderStatus.DELIVERED,
      priority: OrderPriority.NORMAL,
      complaint: 'Rayón profundo en puerta del conductor.',
      diagnosis: 'Reparación menor sin reemplazo de piezas.',
      intakeNotes: 'Servicio histórico para probar filtros de fecha.',
      mileageIn: 27180,
      fuelLevelIn: 50,
      promisedAt: previousMonth(12, 17),
      approvedAt: previousMonth(8, 12),
      startedAt: previousMonth(9, 8),
      completedAt: previousMonth(11, 16),
      deliveredAt: previousMonth(12, 12),
      createdAt: previousMonth(7, 10),
      createdById: superAdmin.id,
      items: [
        {
          type: LineItemType.SERVICE,
          description: 'Reparación y pintura de puerta',
          quantity: 1,
          unitCost: 2100,
          unitPrice: 4650
        }
      ],
      payments: [
        {
          method: PaymentMethod.CARD,
          ratio: 1,
          reference: 'TPV-DEMO-H01',
          paidAt: previousMonth(12, 12),
          recordedById: superAdmin.id
        }
      ]
    },
    {
      id: ids.orders.mechanicalApproved,
      workshopId: mechanicalWorkshop.id,
      customerId: ids.customers.mechanicalOne,
      vehicleId: ids.vehicles.mechanicalOne,
      orderNumber: 'DEMO-MEC-001',
      status: OrderStatus.APPROVED,
      priority: OrderPriority.HIGH,
      complaint: 'Testigo de motor y pérdida ocasional de potencia.',
      diagnosis: 'Bobina de encendido con falla y bujías fuera de especificación.',
      intakeNotes: 'Cliente autorizó por teléfono; vehículo queda en resguardo.',
      internalNotes: 'Confirmar códigos después de prueba de camino.',
      mileageIn: 68340,
      fuelLevelIn: 60,
      promisedAt: futureDate(2),
      approvedAt: thisMonth(9, 14),
      createdAt: thisMonth(8, 9),
      createdById: superAdmin.id,
      items: [
        {
          type: LineItemType.SERVICE,
          description: 'Diagnóstico con escáner y prueba de camino',
          quantity: 1,
          unitCost: 180,
          unitPrice: 850
        },
        {
          type: LineItemType.PART,
          description: 'Bobina de encendido',
          quantity: 1,
          unitCost: 1280,
          unitPrice: 1980
        },
        {
          type: LineItemType.PART,
          description: 'Juego de bujías iridium',
          quantity: 1,
          unitCost: 920,
          unitPrice: 1450
        },
        {
          type: LineItemType.LABOR,
          description: 'Reemplazo de bobina y bujías',
          quantity: 2,
          unitCost: 220,
          unitPrice: 480
        }
      ],
      payments: [
        {
          method: PaymentMethod.CREDIT,
          ratio: 0.35,
          reference: 'CREDITO-DEMO-15D',
          notes: 'Saldo autorizado a crédito',
          paidAt: thisMonth(9, 15),
          recordedById: superAdmin.id
        }
      ]
    },
    {
      id: ids.orders.mechanicalProgress,
      workshopId: mechanicalWorkshop.id,
      customerId: ids.customers.mechanicalTwo,
      vehicleId: ids.vehicles.mechanicalTwo,
      orderNumber: 'DEMO-MEC-002',
      status: OrderStatus.IN_PROGRESS,
      priority: OrderPriority.URGENT,
      complaint: 'Ruido al frenar y vibración a velocidad media.',
      diagnosis: 'Discos delanteros deformados y balatas al límite.',
      intakeNotes: 'Unidad de reparto; entregar lo antes posible.',
      internalNotes: 'Discos confirmados con proveedor local.',
      mileageIn: 148200,
      fuelLevelIn: 25,
      promisedAt: futureDate(1),
      approvedAt: thisMonth(11, 11),
      startedAt: thisMonth(11, 13),
      createdAt: thisMonth(11, 8),
      createdById: superAdmin.id,
      items: [
        {
          type: LineItemType.PART,
          description: 'Discos de freno delanteros',
          quantity: 2,
          unitCost: 1180,
          unitPrice: 1740
        },
        {
          type: LineItemType.PART,
          description: 'Juego de balatas delanteras',
          quantity: 1,
          unitCost: 890,
          unitPrice: 1390
        },
        {
          type: LineItemType.LABOR,
          description: 'Servicio de frenos delanteros',
          quantity: 2.5,
          unitCost: 230,
          unitPrice: 510
        }
      ],
      payments: [
        {
          method: PaymentMethod.CASH,
          ratio: 0.4,
          reference: 'RECIBO-DEMO-2204',
          notes: 'Anticipo en efectivo',
          paidAt: thisMonth(11, 12),
          recordedById: superAdmin.id
        }
      ]
    },
    {
      id: ids.orders.mechanicalReady,
      workshopId: mechanicalWorkshop.id,
      customerId: ids.customers.mechanicalThree,
      vehicleId: ids.vehicles.mechanicalThree,
      orderNumber: 'DEMO-MEC-003',
      status: OrderStatus.READY,
      priority: OrderPriority.NORMAL,
      complaint: 'Golpeteo en suspensión delantera al pasar topes.',
      diagnosis: 'Bieletas con juego y bujes de horquilla cuarteados.',
      intakeNotes: 'Cliente solicita conservar piezas reemplazadas.',
      internalNotes: 'Piezas usadas colocadas en la cajuela.',
      mileageIn: 93410,
      fuelLevelIn: 80,
      promisedAt: futureDate(0),
      approvedAt: thisMonth(6, 13),
      startedAt: thisMonth(7, 8),
      completedAt: thisMonth(13, 16),
      createdAt: thisMonth(6, 9),
      createdById: superAdmin.id,
      items: [
        {
          type: LineItemType.PART,
          description: 'Par de bieletas delanteras',
          quantity: 1,
          unitCost: 980,
          unitPrice: 1580
        },
        {
          type: LineItemType.PART,
          description: 'Juego de bujes de horquilla',
          quantity: 1,
          unitCost: 740,
          unitPrice: 1260
        },
        {
          type: LineItemType.LABOR,
          description: 'Reemplazo de bieletas y bujes',
          quantity: 4,
          unitCost: 230,
          unitPrice: 520
        },
        {
          type: LineItemType.SERVICE,
          description: 'Alineación de cuatro ruedas',
          quantity: 1,
          unitCost: 350,
          unitPrice: 780,
          discount: 100
        }
      ],
      payments: [
        {
          method: PaymentMethod.CARD,
          ratio: 0.55,
          reference: 'TPV-DEMO-7782',
          paidAt: thisMonth(13, 17),
          recordedById: superAdmin.id
        }
      ]
    },
    {
      id: ids.orders.mechanicalDelivered,
      workshopId: mechanicalWorkshop.id,
      customerId: ids.customers.mechanicalFour,
      vehicleId: ids.vehicles.mechanicalFour,
      orderNumber: 'DEMO-MEC-004',
      status: OrderStatus.DELIVERED,
      priority: OrderPriority.NORMAL,
      complaint: 'Servicio preventivo de 60,000 km.',
      diagnosis: 'Sin fallas adicionales; niveles y frenos dentro de especificación.',
      intakeNotes: 'Cliente espera en recepción.',
      internalNotes: 'Próximo servicio sugerido a los 67,000 km.',
      mileageIn: 57200,
      fuelLevelIn: 50,
      promisedAt: thisMonth(17, 15),
      approvedAt: thisMonth(16, 9),
      startedAt: thisMonth(16, 10),
      completedAt: thisMonth(16, 14),
      deliveredAt: thisMonth(16, 15),
      createdAt: thisMonth(16, 8),
      createdById: superAdmin.id,
      items: [
        {
          type: LineItemType.PART,
          description: 'Aceite sintético 5W-30',
          quantity: 4,
          unitCost: 165,
          unitPrice: 245
        },
        {
          type: LineItemType.PART,
          description: 'Filtro de aceite',
          quantity: 1,
          unitCost: 115,
          unitPrice: 210
        },
        {
          type: LineItemType.SERVICE,
          description: 'Servicio preventivo y revisión de 25 puntos',
          quantity: 1,
          unitCost: 350,
          unitPrice: 980
        },
        {
          type: LineItemType.OTHER,
          description: 'Gestión de residuos y consumibles',
          quantity: 1,
          unitCost: 80,
          unitPrice: 150,
          taxRate: 0
        }
      ],
      payments: [
        {
          method: PaymentMethod.CHECK,
          ratio: 0.5,
          reference: 'CHEQUE-DEMO-1048',
          paidAt: thisMonth(16, 15),
          recordedById: superAdmin.id
        },
        {
          method: PaymentMethod.OTHER,
          ratio: 0.5,
          reference: 'VALE-DEMO-294',
          notes: 'Vale corporativo de muestra',
          paidAt: thisMonth(16, 15),
          recordedById: superAdmin.id
        }
      ]
    },
    {
      id: ids.orders.mechanicalDeliveredHistory,
      workshopId: mechanicalWorkshop.id,
      customerId: ids.customers.mechanicalThree,
      vehicleId: ids.vehicles.mechanicalThree,
      orderNumber: 'DEMO-MEC-H01',
      status: OrderStatus.DELIVERED,
      priority: OrderPriority.NORMAL,
      complaint: 'Cambio de batería por arranque lento.',
      diagnosis: 'Batería fuera de rango; alternador operando correctamente.',
      intakeNotes: 'Servicio histórico para probar filtros de fecha.',
      mileageIn: 91820,
      fuelLevelIn: 75,
      promisedAt: previousMonth(19, 14),
      approvedAt: previousMonth(18, 10),
      startedAt: previousMonth(18, 11),
      completedAt: previousMonth(18, 13),
      deliveredAt: previousMonth(18, 14),
      createdAt: previousMonth(18, 9),
      createdById: superAdmin.id,
      items: [
        {
          type: LineItemType.PART,
          description: 'Batería L-42-550',
          quantity: 1,
          unitCost: 1950,
          unitPrice: 2790
        },
        {
          type: LineItemType.SERVICE,
          description: 'Diagnóstico de sistema de carga',
          quantity: 1,
          unitCost: 120,
          unitPrice: 480
        }
      ],
      payments: [
        {
          method: PaymentMethod.TRANSFER,
          ratio: 1,
          reference: 'SPEI-DEMO-H02',
          paidAt: previousMonth(18, 14),
          recordedById: superAdmin.id
        }
      ]
    }
  ]

  for (const order of orders) {
    await upsertDemoOrder(order)
  }

  const expenses = [
    {
      id: '60000000-0000-4000-8000-000000000001',
      workshopId: bodyWorkshop.id,
      category: ExpenseCategory.RENT,
      description: 'Renta mensual del taller',
      vendor: 'Inmobiliaria Industrial del Norte',
      amount: 28500,
      expenseDate: thisMonth(1, 9),
      notes: 'Transferencia mensual · muestra',
      recordedById: superAdmin.id
    },
    {
      id: '60000000-0000-4000-8000-000000000002',
      workshopId: bodyWorkshop.id,
      category: ExpenseCategory.PAYROLL,
      description: 'Anticipo de nómina quincenal',
      vendor: null,
      amount: 36400,
      expenseDate: thisMonth(15, 12),
      notes: 'Registro agregado para revisar resultados financieros',
      recordedById: superAdmin.id
    },
    {
      id: '60000000-0000-4000-8000-000000000003',
      workshopId: bodyWorkshop.id,
      category: ExpenseCategory.SUPPLIES,
      description: 'Lijas, cinta y materiales de enmascarado',
      vendor: 'Suministros de Pintura Baja',
      amount: 6840,
      expenseDate: thisMonth(8, 11),
      notes: 'Compra de consumibles sin control de inventario',
      recordedById: superAdmin.id
    },
    {
      id: '60000000-0000-4000-8000-000000000004',
      workshopId: bodyWorkshop.id,
      category: ExpenseCategory.MARKETING,
      description: 'Campaña local en redes sociales',
      vendor: 'Agencia Norte Digital',
      amount: 3200,
      expenseDate: thisMonth(12, 10),
      notes: 'Promoción de reparación de golpes menores',
      recordedById: superAdmin.id
    },
    {
      id: '60000000-0000-4000-8000-000000000005',
      workshopId: mechanicalWorkshop.id,
      category: ExpenseCategory.UTILITIES,
      description: 'Electricidad y agua del mes',
      vendor: 'Servicios públicos',
      amount: 7450,
      expenseDate: thisMonth(5, 10),
      notes: 'Pago mensual de muestra',
      recordedById: superAdmin.id
    },
    {
      id: '60000000-0000-4000-8000-000000000006',
      workshopId: mechanicalWorkshop.id,
      category: ExpenseCategory.MAINTENANCE,
      description: 'Servicio preventivo a elevador hidráulico',
      vendor: 'Equipos Automotrices del Pacífico',
      amount: 4950,
      expenseDate: thisMonth(9, 13),
      notes: 'Mantenimiento programado',
      recordedById: superAdmin.id
    },
    {
      id: '60000000-0000-4000-8000-000000000007',
      workshopId: mechanicalWorkshop.id,
      category: ExpenseCategory.TAXES,
      description: 'Pago provisional de impuestos',
      vendor: 'SAT',
      amount: 11800,
      expenseDate: thisMonth(17, 9),
      notes: 'Importe demostrativo; sin integración contable',
      recordedById: superAdmin.id
    },
    {
      id: '60000000-0000-4000-8000-000000000008',
      workshopId: mechanicalWorkshop.id,
      category: ExpenseCategory.OTHER,
      description: 'Uniformes y equipo de protección',
      vendor: 'Seguridad Industrial Tijuana',
      amount: 3850,
      expenseDate: thisMonth(13, 14),
      notes: 'Gasto operativo diverso',
      recordedById: superAdmin.id
    }
  ]

  for (const expense of expenses) {
    await prisma.expense.upsert({
      where: { id: expense.id },
      update: expense,
      create: expense
    })
  }

  const summary = await Promise.all([
    prisma.workshop.count(),
    prisma.profile.count({ where: { email: { endsWith: '@demo.cvr.local' } } }),
    prisma.customer.count({ where: { id: { in: Object.values(ids.customers) } } }),
    prisma.vehicle.count({ where: { id: { in: Object.values(ids.vehicles) } } }),
    prisma.serviceOrder.count({ where: { id: { in: Object.values(ids.orders) } } }),
    prisma.orderItem.count({
      where: { order: { id: { in: Object.values(ids.orders) } } }
    }),
    prisma.payment.count({
      where: { order: { id: { in: Object.values(ids.orders) } } }
    }),
    prisma.expense.count({ where: { id: { in: expenses.map(expense => expense.id) } } })
  ])

  console.log([
    'Datos de muestra listos:',
    `- ${summary[0]} talleres`,
    `- ${summary[1]} colaboradores DEMO`,
    `- ${summary[2]} clientes`,
    `- ${summary[3]} vehículos`,
    `- ${summary[4]} órdenes`,
    `- ${summary[5]} conceptos`,
    `- ${summary[6]} pagos`,
    `- ${summary[7]} gastos`
  ].join('\n'))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
