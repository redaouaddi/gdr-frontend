import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit {

  loginForm!: FormGroup;
  isLoading = false;
  loginError = '';

  currentLang = 'fr';

  constructor(
    private fb: FormBuilder,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {

    this.loginForm = this.fb.group({
      email: ['', Validators.required],
      password: ['', Validators.required]
    });

    const savedLang = localStorage.getItem('lang') || 'fr';
    this.currentLang = savedLang;
    this.translate.use(savedLang);
  }

  switchLang(lang: string) {
    this.currentLang = lang;
    this.translate.use(lang);
    localStorage.setItem('lang', lang);
  }

  onSubmit() {}

  openFaceLoginModal() {}

}