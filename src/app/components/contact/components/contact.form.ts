import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { wrapError } from '../../shared/common/wrap.error';
import { WrappedError } from '../../shared/definitions/wrapped.error';
import { ContactMessage } from '../definitions/contact.message';
import { IErrorMessage } from '../definitions/error.message';
import { ContactService } from '../services/contact';

@Component({
  selector: 'app-contact-form',
  styleUrls: ['./contact.form.scss'],
  templateUrl: 'contact.form.html',
})
export class ContactFormComponent implements OnInit {
  public email: FormControl;
  public errorMessages: Array<IErrorMessage>;
  public form: FormGroup;
  public heuning: FormControl;
  public message: FormControl;
  public name: FormControl;
  public sentSuccessfully: boolean;
  public serverErrors: string;
  public submitBtnText: string;
  public submitClicked: boolean;
  public submitting: boolean;
  private _contactService: ContactService;

  constructor(contactService: ContactService, fb: FormBuilder) {
    this.email = new FormControl('', Validators.required);
    this.heuning = new FormControl('');
    this.message = new FormControl('', Validators.required);
    this.name = new FormControl('', Validators.required);
    this.form = fb.group({
      email: this.email,
      heuning: this.heuning,
      message: this.message,
      name: this.name,
    });
    this.sentSuccessfully = false;
    this.submitBtnText = 'Send message';
    this.submitClicked = false;
    this.submitting = false;
    this._contactService = contactService;
  }

  ngOnInit(): void {
    this.loadErrorMessages();
  }

  loadErrorMessages(): void {
    ContactService.getErrorMessages().then(
      (errorMessages) => {
        this.errorMessages = errorMessages;
      },
    );
  }

  onClick(): void {
    this.submitClicked = true;
  }

  onSubmit(): void {
    this.toggleSubmitting();
    this.serverErrors = '';

    const submission: ContactMessage = new ContactMessage(
      this.name.value.trim(),
      this.email.value.trim(),
      this.message.value.trim(),
      this.heuning.value,
    );

    this._contactService.send(submission).subscribe(
      () => this.handleSuccess(),
      (err: HttpErrorResponse) => this.handleErrors(wrapError(err)),
    );
  }

  handleSuccess(): void {
    this.toggleSubmitting();
    this.sentSuccessfully = true;
  }

  handleErrors(err: WrappedError): void {
    this.toggleSubmitting();
    switch (err.status) {
      case 400:
        err.content.errors.forEach((error: string) => {
          this.appendError(this.errorFromCode(error));
        });
        break;
      case 500:
      default:
        this.appendError(this.errorFromCode('e_generic'));
        break;
    }
  }

  errorFromCode(code: string): string {
    return this.errorMessages.find((message: IErrorMessage) => {
      return message.code === code;
    }).message;
  }

  appendError(error: string): void {
    if (error) {
      if (this.serverErrors) {
        this.serverErrors += '<br>';
      }
      this.serverErrors += error;
    }
  }

  toggleSubmitting(): void {
    this.submitting = !this.submitting;
    this.submitBtnText = this.submitting ? 'Sending...' : 'Send message';
  }
}
