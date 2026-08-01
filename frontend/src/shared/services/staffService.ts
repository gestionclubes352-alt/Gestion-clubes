import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { firestore } from './firebase';
import type { StaffMember } from '../../modules/staff/types';

const COLLECTION = 'staff';

export async function getStaff(): Promise<StaffMember[]> {
  const q = query(collection(firestore, COLLECTION), orderBy('nombre', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as StaffMember));
}

export async function addStaff(member: Omit<StaffMember, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(firestore, COLLECTION), member);
  return docRef.id;
}

export async function updateStaff(id: string, member: Partial<StaffMember>): Promise<void> {
  await updateDoc(doc(firestore, COLLECTION, id), member);
}

export async function deleteStaff(id: string): Promise<void> {
  await deleteDoc(doc(firestore, COLLECTION, id));
}

export async function getStaffMember(id: string): Promise<StaffMember | null> {
  const d = await getDoc(doc(firestore, COLLECTION, id));
  return d.exists() ? ({ id: d.id, ...d.data() } as StaffMember) : null;
}
