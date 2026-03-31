import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css'],
  standalone: true
})
export class SidebarComponent implements OnInit {
  isAdmin = false;
  isClient = false;
  
  usersMenuOpen = false;
  reclamationsMenuOpen = false;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    const user = this.authService.getUser();
    if (user && user.roles) {
      this.isAdmin = user.roles.includes('ROLE_ADMIN');
      this.isClient = user.roles.includes('ROLE_CLIENT') || user.roles.includes('ROLE_USER');
    }
  }

  toggleUsersMenu() {
    this.usersMenuOpen = !this.usersMenuOpen;
  }

  toggleReclamationsMenu() {
    this.reclamationsMenuOpen = !this.reclamationsMenuOpen;
  }
}
