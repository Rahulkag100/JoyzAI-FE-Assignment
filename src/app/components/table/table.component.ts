import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Users, ValidationError } from '../../models/validation.model';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss',
})
export class TableComponent {
  @Input() users: Users[] = [];
  @Input() validationErrors: ValidationError[] = [];

  getValidationError(user: Users): ValidationError | undefined {
    return this.validationErrors.find((error) => error.email === user.email);
  }

  getErrorBadgeClass(errorType: string): string {
    switch (errorType) {
      case 'Hierarchy Violation':
        return 'error-badge--hierarchy';
      case 'Multiple Supervisors':
        return 'error-badge--multiple';
      case 'Cycle Detected':
        return 'error-badge--cycle';
      case 'Invalid Supervisor':
        return 'error-badge--invalid';
      default:
        return 'error-badge--other';
    }
  }
}
