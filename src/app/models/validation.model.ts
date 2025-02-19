export interface Users {
  email: string;
  fullName: string;
  role: 'Root' | 'Admin' | 'Manager' | 'Caller';
  reportsTo: string;
}

export interface ValidationError {
  rowIndex: number;
  email: string;
  fullName: string;
  errorType: string;
  details: string;
}
