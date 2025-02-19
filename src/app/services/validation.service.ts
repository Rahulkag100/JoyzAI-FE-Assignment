import { Injectable } from '@angular/core';
import { Users, ValidationError } from '../models/validation.model';
@Injectable({
  providedIn: 'root',
})
export class ValidationService {
  parseCSV(fileContent: string): Users[] {
    const lines = fileContent.split(/\r\n|\n/);
    const header = lines[0].split(',');

    const emailIndex = header.findIndex((h) => h.toLowerCase() === 'email');
    const nameIndex = header.findIndex((h) => h.toLowerCase() === 'fullname');
    const roleIndex = header.findIndex((h) => h.toLowerCase() === 'role');
    const reportsToIndex = header.findIndex(
      (h) => h.toLowerCase() === 'reportsto'
    );

    if (
      emailIndex === -1 ||
      nameIndex === -1 ||
      roleIndex === -1 ||
      reportsToIndex === -1
    ) {
      throw new Error(
        'CSV format invalid. Required columns: Email, FullName, Role, ReportsTo'
      );
    }

    const employees: Users[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      const values = this.parseCSVLine(lines[i]);

      if (
        values.length >=
        Math.max(emailIndex, nameIndex, roleIndex, reportsToIndex) + 1
      ) {
        employees.push({
          email: values[emailIndex],
          fullName: values[nameIndex],
          role: values[roleIndex] as any,
          reportsTo: values[reportsToIndex] || '',
        });
      }
    }

    return employees;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  validateOrganizationData(data: Users[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const emailToUser = new Map<string, Users>();
    data.forEach((user) => {
      emailToUser.set(user.email, user);
    });
    data.forEach((user, index) => {
      // Check for multiple supervisors
      if (user.reportsTo.includes(';')) {
        errors.push({
          rowIndex: index + 2, // +2 for header row and 0-indexing
          email: user.email,
          fullName: user.fullName,
          errorType: 'Multiple Supervisors',
          details: `User reports to multiple supervisors: ${user.reportsTo}`,
        });
      }

      // Handle regular validation for each supervisor (even if multiple)
      const supervisors = user.reportsTo.split(';');
      supervisors.forEach((supervisorEmail) => {
        if (!supervisorEmail) return; // Skip empty supervisor (for Root)

        const supervisor = emailToUser.get(supervisorEmail);
        if (!supervisor) {
          errors.push({
            rowIndex: index + 2,
            email: user.email,
            fullName: user.fullName,
            errorType: 'Invalid Supervisor',
            details: `Supervisor ${supervisorEmail} does not exist`,
          });
          return;
        }

        // Validate hierarchy rules
        if (user.role === 'Admin') {
          if (supervisor.role !== 'Root') {
            errors.push({
              rowIndex: index + 2,
              email: user.email,
              fullName: user.fullName,
              errorType: 'Hierarchy Violation',
              details: `Admin (${user.email}) must report only to Root, but reports to ${supervisor.role} (${supervisor.email})`,
            });
          }
        } else if (user.role === 'Manager') {
          if (supervisor.role !== 'Admin' && supervisor.role !== 'Manager') {
            errors.push({
              rowIndex: index + 2,
              email: user.email,
              fullName: user.fullName,
              errorType: 'Hierarchy Violation',
              details: `Manager (${user.email}) must report to Admin or Manager, but reports to ${supervisor.role} (${supervisor.email})`,
            });
          }
        } else if (user.role === 'Caller') {
          if (supervisor.role !== 'Manager') {
            errors.push({
              rowIndex: index + 2,
              email: user.email,
              fullName: user.fullName,
              errorType: 'Hierarchy Violation',
              details: `Caller (${user.email}) must report only to Manager, but reports to ${supervisor.role} (${supervisor.email})`,
            });
          }
        }
      });
    });

    // Third pass: detect cycles in the reporting structure
    this.detectCycles(data, emailToUser, errors);

    return errors;
  }

  private detectCycles(
    data: Users[],
    emailToUser: Map<string, Users>,
    errors: ValidationError[]
  ): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const detectedCycle = (email: string, path: string[] = []): boolean => {
      if (!email) return false;
      if (recursionStack.has(email)) {
        // Cycle detected
        const cycleStart = path.indexOf(email);
        const cycle = [...path.slice(cycleStart), email];

        // Add cycle error for each node in the cycle
        data.forEach((user, index) => {
          if (cycle.includes(user.email)) {
            errors.push({
              rowIndex: index + 2,
              email: user.email,
              fullName: user.fullName,
              errorType: 'Cycle Detected',
              details: `Part of reporting cycle: ${cycle.join(' → ')}`,
            });
          }
        });

        return true;
      }

      if (visited.has(email)) return false;

      visited.add(email);
      recursionStack.add(email);
      path.push(email);

      const users = emailToUser.get(email);
      if (users && users.reportsTo) {
        const supervisors = users.reportsTo.split(';');
        for (const supervisor of supervisors) {
          if (detectedCycle(supervisor, [...path])) {
            return true;
          }
        }
      }

      recursionStack.delete(email);
      return false;
    };

    // Run detectedCycle for each user to catch all possible cycles
    data.forEach((user) => {
      if (!visited.has(user.email)) {
        detectedCycle(user.email);
      }
    });
  }
}
