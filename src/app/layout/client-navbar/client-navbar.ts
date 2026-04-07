import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-client-navbar',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './client-navbar.html',
  styleUrls: ['./client-navbar.css']
})
export class ClientNavbarComponent implements OnInit {
  @Input() activeItem: string = '';

  user = JSON.parse(localStorage.getItem('user') || 'null');
  menuOpen = false;

  constructor(private router: Router) {}

  ngOnInit(): void {}

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }
}