import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService, UserResponse } from '../../../core/services/user.service';
import { SidebarComponent } from '../../../layout/sidebar/sidebar';
import { NavbarComponent } from '../../../layout/navbar/navbar';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, SidebarComponent, NavbarComponent, RouterLink],
  templateUrl: './user-list.component.html'
})
export class UserListComponent implements OnInit {

  users: UserResponse[] = [];
  errorMessage = '';

  constructor(
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('ngOnInit user-list');
    this.loadUsers();
  }

  loadUsers(): void {
    console.log('Appel API getAllUsers...');
    this.userService.getAllUsers().subscribe({
      next: (data) => {
        console.log('DATA RECUE =', data);
        this.users = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('ERREUR API =', err);
        this.errorMessage = 'Impossible de charger les utilisateurs.';
        this.cdr.detectChanges();
      }
    });
  }
}