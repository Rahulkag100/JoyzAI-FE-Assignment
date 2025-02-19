import { Component } from '@angular/core';
import { ValidationService } from '../../services/validation.service';
import * as XLSX from 'xlsx';
import { TableComponent } from '../table/table.component';
import { CommonModule } from '@angular/common';
import { Users, ValidationError } from '../../models/validation.model';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [TableComponent, CommonModule],
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.scss',
})
export class FileUploadComponent {
  file: File | null = null;
  users: Users[] = [];
  validationErrors: ValidationError[] = [];
  isUploading = false;
  uploadSuccess = false;
  generalError = '';
  showTableView = false;

  constructor(private validator: ValidationService) {}

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    this.file = file;
    this.generalError = '';
    this.uploadSuccess = false;
    this.showTableView = false;

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (fileExt !== 'csv' && fileExt !== 'xlsx' && fileExt !== 'xls') {
      this.generalError = 'Only CSV and Excel files are supported.';
      this.file = null;
      return;
    }
  }

  uploadFile(): void {
    if (!this.file) {
      this.generalError = 'Please select a file first.';
      return;
    }

    this.isUploading = true;
    this.generalError = '';

    const fileExt = this.file.name.split('.').pop()?.toLowerCase();

    if (fileExt === 'csv') {
      this.processCSV();
    } else if (fileExt === 'xlsx' || fileExt === 'xls') {
      this.processExcel();
    }
  }

  private processCSV(): void {
    const reader = new FileReader();
    reader.readAsText(this.file as File);

    reader.onload = () => {
      try {
        const csvContent = reader.result as string;
        this.users = this.validator.parseCSV(csvContent);
        this.validateData();
      } catch (error) {
        this.handleError(error);
      }
    };

    reader.onerror = () => {
      this.handleError('Failed to read the CSV file.');
    };
  }

  private processExcel(): void {
    const reader = new FileReader();
    reader.readAsArrayBuffer(this.file as File);

    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const csvContent = XLSX.utils.sheet_to_csv(firstSheet);

        this.users = this.validator.parseCSV(csvContent);
        this.validateData();
      } catch (error) {
        this.handleError(error);
      }
    };

    reader.onerror = () => {
      this.handleError('Failed to read the Excel file.');
    };
  }

  private validateData(): void {
    this.validationErrors = this.validator.validateOrganizationData(this.users);
    this.uploadSuccess = this.validationErrors.length === 0;
    this.showTableView = true;
    this.isUploading = false;
  }

  private handleError(error: any): void {
    this.generalError = `Error processing file: ${
      error instanceof Error ? error.message : 'Unknown error'
    }`;
    this.isUploading = false;
    this.showTableView = false;
    this.uploadSuccess = false;
    this.users = [];
    this.validationErrors = [];
  }

  clearFile(): void {
    this.file = null;
    this.users = [];
    this.validationErrors = [];
    this.uploadSuccess = false;
    this.generalError = '';
    this.showTableView = false;
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }
}
