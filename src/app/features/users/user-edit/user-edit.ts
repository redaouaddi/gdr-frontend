import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { Navbar } from '../../../layout/navbar/navbar';
import { Sidebar} from '../../../layout/sidebar/sidebar';
import { UserService } from '../../../core/services/user.service';
import { AccessService } from '../../../core/services/access.service';
import { Access } from '../../../core/models/access.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

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
      gender: ['', Validators.required]
    });

    if (this.userId) {
      this.loadUser();
    }
    this.loadRoles();
  }

  loadRoles(): void {
    this.accessService.getAll().subscribe({
      next: (data) => {
        this.roles = data.filter(r => !r.deleted);
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

  onSubmit(): void {
    if (this.userForm.invalid) {
      return;
    }

    const formValue = this.userForm.getRawValue();

    this.userService.updateUser(this.userId, {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      gender: formValue.gender,
      roles: this.selectedRoles
    }).subscribe({
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