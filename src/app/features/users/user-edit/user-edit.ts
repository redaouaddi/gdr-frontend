import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { Navbar } from '../../../layout/navbar/navbar';
import { Sidebar} from '../../../layout/sidebar/sidebar';
import { UserService } from '../../../core/services/user.service';
import { AccessService } from '../../../core/services/access.service';
import { Access } from '../../../core/models/access.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

export function passwordRobustnessValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) {
      return null;
    }
    const hasLength = value.length >= 8;
    const hasUppercase = /[A-Z]/.test(value);
    const hasLowercase = /[a-z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    
    const isRobust = hasLength && hasUppercase && hasLowercase && hasNumber;
    return isRobust ? null : { passwordWeak: true };
  };
}

@Component({
  selector: 'app-user-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Navbar, RouterLink, Sidebar, TranslateModule],
  templateUrl: './user-edit.html'
})
export class UserEdit implements OnInit {

  userForm!: FormGroup;
  userId!: number;
  errorMessage = '';
  successMessage = '';
  roles: Access[] = [];
  selectedRoles: string[] = [];

  passwordStrength = {
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    score: 0
  };

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private accessService: AccessService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.userId = Number(this.route.snapshot.paramMap.get('id'));

    this.userForm = this.fb.group({
      firstName: [{ value: '', disabled: false }, Validators.required],
      lastName: [{ value: '', disabled: false }, Validators.required],
      email: [{ value: '', disabled: false }, [Validators.required, Validators.email]],
      password: ['', [passwordRobustnessValidator()]],
      gender: ['', Validators.required]
    });

    this.userForm.get('password')?.valueChanges.subscribe(val => {
      this.checkPasswordStrength(val || '');
    });

    if (this.userId) {
      this.loadUser();
    }
    this.loadRoles();
  }

  loadRoles(): void {
    // Fetch with large size for selection
    this.accessService.getAll(0, 1000).subscribe({
      next: (response) => {
        this.roles = (response.content || []).filter((r: Access) => !r.deleted);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading roles', err)
    });
  }

  loadUser(): void {
    this.userService.getUserById(this.userId).subscribe({
      next: (user) => {
        this.userForm.patchValue({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          gender: user.gender
        });
        this.selectedRoles = user.roles || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = this.translate.instant('user_edit.errors.load_failed');
        this.cdr.detectChanges();
      }
    });
  }

  onRoleToggle(roleName: string): void {
    if (this.selectedRoles.includes(roleName)) {
      this.selectedRoles = this.selectedRoles.filter(r => r !== roleName);
    } else {
      this.selectedRoles.push(roleName);
    }
  }

  isRoleSelected(roleName: string): boolean {
    return this.selectedRoles.includes(roleName);
  }

  checkPasswordStrength(val: string): void {
    if (!val) {
      this.passwordStrength = {
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        score: 0
      };
      return;
    }
    this.passwordStrength.length = val.length >= 8;
    this.passwordStrength.uppercase = /[A-Z]/.test(val);
    this.passwordStrength.lowercase = /[a-z]/.test(val);
    this.passwordStrength.number = /[0-9]/.test(val);

    let score = 0;
    if (this.passwordStrength.length) score++;
    if (this.passwordStrength.uppercase) score++;
    if (this.passwordStrength.lowercase) score++;
    if (this.passwordStrength.number) score++;
    
    this.passwordStrength.score = score;
    this.cdr.detectChanges();
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      return;
    }

    const formValue = this.userForm.getRawValue();

    const updatePayload: any = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      gender: formValue.gender,
      roles: this.selectedRoles
    };

    if (formValue.password) {
      updatePayload.password = formValue.password;
    }

    this.userService.updateUser(this.userId, updatePayload).subscribe({
      next: () => {
        this.successMessage = this.translate.instant('user_edit.messages.success');
        setTimeout(() => {
          this.router.navigate(['/admin/users']);
        }, 1000);
      },
      error: () => {
        this.errorMessage = this.translate.instant('user_edit.errors.update_failed');
        this.cdr.detectChanges();
      }
    });
  }
}