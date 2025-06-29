import { Session, Client, MonthlyFinance } from '@/types';

export const mockSessions: Session[] = [
  {
    id: '1',
    ownerName: 'Lisa Gebler',
    dogName: 'Marla',
    bookingDate: new Date('2025-07-30T09:30:00'),
    sessionType: 'In-Person',
    quote: 75,
    paid: true,
    behaviourPlanSent: true,
  },
  {
    id: '2',
    ownerName: 'Chris Dziamski',
    dogName: 'Pastel',
    bookingDate: new Date('2025-07-25T12:00:00'),
    sessionType: 'In-Person',
    quote: 85,
    paid: true,
    behaviourPlanSent: false,
  },
  {
    id: '3',
    ownerName: 'Paul Sherwood',
    dogName: 'Cheeka',
    bookingDate: new Date('2025-07-25T09:15:00'),
    sessionType: 'In-Person',
    quote: 75,
    paid: false,
    behaviourPlanSent: true,
  },
  {
    id: '4',
    ownerName: 'Joanna Lilley',
    dogName: 'Milo',
    bookingDate: new Date('2025-07-23T10:00:00'),
    sessionType: 'In-Person',
    quote: 80,
    paid: true,
    behaviourPlanSent: false,
  },
  {
    id: '5',
    ownerName: 'Leo Cackett',
    dogName: 'Smokey',
    bookingDate: new Date('2025-07-18T09:00:00'),
    sessionType: 'Training',
    quote: 85,
    paid: false,
    behaviourPlanSent: true,
  },
  {
    id: '6',
    ownerName: 'Katie Pickett',
    dogName: '',
    bookingDate: new Date('2025-07-11T09:30:00'),
    sessionType: 'In-Person',
    quote: 75,
    paid: true,
    behaviourPlanSent: false,
  },
  {
    id: '7',
    ownerName: 'Victoria Dickson',
    dogName: 'Murphy',
    bookingDate: new Date('2025-07-10T09:30:00'),
    sessionType: 'In-Person',
    quote: 80,
    paid: false,
    behaviourPlanSent: true,
  },
  {
    id: '8',
    ownerName: 'Louise Rowntree',
    dogName: 'Paddy',
    bookingDate: new Date('2025-07-08T09:30:00'),
    sessionType: 'Training',
    quote: 85,
    paid: true,
    behaviourPlanSent: false,
  },
  {
    id: '9',
    ownerName: 'Rose Halpin',
    dogName: 'Bear',
    bookingDate: new Date('2025-07-07T16:30:00'),
    sessionType: 'Online',
    quote: 60,
    paid: false,
    behaviourPlanSent: true,
  },
  {
    id: '10',
    ownerName: 'Group Session',
    dogName: '',
    bookingDate: new Date('2025-07-04T19:00:00'),
    sessionType: 'Group',
    quote: 25,
    paid: true,
    behaviourPlanSent: false,
  },
];

export const mockClients: Client[] = [
  { id: '1', ownerName: 'Sarah Cook', dogName: 'Larry', active: true },
  { id: '2', ownerName: 'Test User', dogName: '', active: true, avatar: 'RMR' },
  { id: '3', ownerName: 'Grace Bryant', dogName: 'Ruby', active: true },
  { id: '4', ownerName: 'Julie Moore', dogName: 'Mila', active: true },
  { id: '5', ownerName: 'Amelia Wright', dogName: 'Milo', active: true },
  { id: '6', ownerName: 'Tara Connolly', dogName: '', active: true, avatar: 'RMR' },
  { id: '7', ownerName: 'Rose Halpin', dogName: 'Bear', active: true },
  { id: '8', ownerName: 'Louise Rowntree', dogName: 'Paddy', active: true, avatar: 'RMR' },
  { id: '9', ownerName: 'Katy Suckling', dogName: 'Remy', active: true, avatar: 'RMR' },
  { id: '10', ownerName: 'Jay Dobinsteen', dogName: 'Winnie', active: true },
];

export const mockFinances: MonthlyFinance[] = [
  { month: 'June', year: 2025, expected: 2600, actual: 2344, variance: -256 },
  { month: 'July', year: 2025, expected: 2000, actual: 785, variance: -1215 },
  { month: 'May', year: 2025, expected: 2800, actual: 2871, variance: 71 },
  { month: 'April', year: 2025, expected: 1730, actual: 1536, variance: 9 },
  { month: 'April', year: 2024, expected: 1730, actual: 203, variance: 9 },
  { month: 'March', year: 2024, expected: 1550, actual: 1777, variance: 227 },
  { month: 'February', year: 2024, expected: 1619, actual: 1643, variance: 24 },
  { month: 'January', year: 2024, expected: 1200, actual: 1421, variance: 221 },
  { month: 'December', year: 2023, expected: 900, actual: 985, variance: 85 },
  { month: 'November', year: 2023, expected: 900, actual: 960, variance: 60 },
  { month: 'October', year: 2023, expected: 757, actual: 757, variance: 0 },
];
