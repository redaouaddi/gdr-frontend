import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ReclamationService } from '../../core/services/reclamation.service';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'danger' | 'success';
  date: Date;
  unread: boolean;
  link?: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class Navbar implements OnInit, OnDestroy {

  user = JSON.parse(localStorage.getItem('user') || 'null');
  menuOpen = false;

  notifications: AppNotification[] = [];
  unreadCount = 0;
  showNotifications = false;
  isChefEquipe = false;
  private refreshInterval: any;

  constructor(
    private router: Router,
    private reclamationService: ReclamationService
  ) {}

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    this.showNotifications = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    this.showNotifications = false;
  }


  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  ngOnInit(): void {
    const userData = localStorage.getItem('user');
    if (userData) {
      this.user = JSON.parse(userData);
    }
    this.detectChefEquipe();
    this.detectUserRole();

    if (this.user) {
      this.loadNotifications();
      // Rafraîchir les notifications toutes les 30 secondes
      this.refreshInterval = setInterval(() => {
        this.loadNotifications();
      }, 30000);
    }
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  detectChefEquipe(): void {
    if (!this.user) return;
    const role = this.user.role || this.user.roles?.[0] || '';
    this.isChefEquipe =
      role === 'CHEF_EQUIPE' ||
      role === 'ROLE_CHEF_EQUIPE' ||
      role === 'SERVICE_MANAGER' ||
      role === 'ROLE_SERVICE_MANAGER';
  }

  userRole = '';
  detectUserRole(): void {
    if (!this.user) return;
    const role = this.user.role || this.user.roles?.[0] || '';
    this.userRole = role.toUpperCase();
  }

  loadNotifications(): void {
    if (!this.user || !this.userRole) return;

    const readKeys: string[] = JSON.parse(localStorage.getItem('readNotificationKeys') || '[]');
    const now = new Date();

    // 1. Lire d'abord les notifications SLA locales pour les rôles concernés
    const slaData = JSON.parse(localStorage.getItem('slaNotifications') || '[]');
    const isSlaRelevant = 
      this.userRole.includes('AGENT') || 
      this.userRole.includes('CHEF_EQUIPE') || 
      this.userRole.includes('ADMIN');

    const localSlaNotifs: AppNotification[] = isSlaRelevant
      ? slaData.map((n: any) => {
          const key = n.key || `sla-${n.title}-${n.date}`;
          return {
            id: key,
            title: n.title || 'Alerte SLA',
            message: n.message,
            type: n.type === 'danger' ? 'danger' : (n.type === 'warning' ? 'warning' : 'info'),
            date: new Date(n.date),
            unread: !readKeys.includes(key),
            link: this.userRole.includes('ADMIN') ? '/admin/reclamations' : '/dashboard/agent-missions'
          };
        })
      : [];

    // 2. Charger les notifications selon le rôle spécifique de l'utilisateur
    if (this.userRole.includes('CLIENT')) {
      // --- CONTEXTE CLIENT ---
      this.reclamationService.getMyReclamations(0, 50).subscribe({
        next: (response) => {
          const myRecs = response.content || [];
          
          const clientNotifs: AppNotification[] = myRecs
            .filter(r => r.statut === 'EN_COURS' || r.statut === 'TRAITEE' || r.statut === 'REJETEE' || r.statut === 'REOUVERTE')
            .map(r => {
              const key = `client-${r.numeroReclamation}-${r.statut}`;
              
              let title = 'Mise à jour de votre réclamation';
              let message = `Votre réclamation #${r.numeroReclamation} (« ${r.titre} ») est en cours de traitement.`;
              let type: 'info' | 'success' | 'danger' | 'warning' = 'info';

              if (r.statut === 'TRAITEE') {
                title = 'Réclamation Résolue';
                message = `Bonne nouvelle ! Votre réclamation #${r.numeroReclamation} (« ${r.titre} ») a été résolue par nos équipes.`;
                type = 'success';
              } else if (r.statut === 'REJETEE') {
                title = 'Réclamation Refusée';
                message = `Votre réclamation #${r.numeroReclamation} (« ${r.titre} ») a été rejetée. Motif : ${r.motifRefus || 'Non spécifié'}`;
                type = 'danger';
              } else if (r.statut === 'REOUVERTE') {
                title = 'Réclamation Réouverte';
                message = `Vous avez réouvert la réclamation #${r.numeroReclamation} (« ${r.titre} »).`;
                type = 'warning';
              }

              return {
                id: key,
                title,
                message,
                type,
                date: r.dateMiseAJour ? new Date(r.dateMiseAJour) : new Date(r.dateCreation || now),
                unread: !readKeys.includes(key),
                link: '/dashboard-client'
              };
            });

          this.notifications = clientNotifs.sort((a, b) => b.date.getTime() - a.date.getTime());
          this.unreadCount = this.notifications.filter(n => n.unread).length;
        },
        error: (err) => console.error('Erreur notifications client', err)
      });

    } else if (this.userRole.includes('AGENT') && !this.userRole.includes('CHEF')) {
      // --- CONTEXTE AGENT SIMPLE ---
      this.reclamationService.getMesMissions(0, 50).subscribe({
        next: (response) => {
          const missions = response.content || [];
          
          const myMissions = missions.filter(m => m.statut === 'EN_COURS' || m.statut === 'REOUVERTE');
          
          const agentNotifs: AppNotification[] = myMissions.map(m => {
            const key = `agent-${m.numeroReclamation}-${m.statut}`;
            const isReopened = m.statut === 'REOUVERTE';
            return {
              id: key,
              title: isReopened ? 'Mission Réouverte par le client' : 'Nouvelle Mission Assignée',
              message: isReopened 
                ? `La réclamation #${m.numeroReclamation} (« ${m.titre} ») a été réouverte par le client.` 
                : `La réclamation #${m.numeroReclamation} (« ${m.titre} ») vous a été assignée pour traitement.`,
              type: isReopened ? 'warning' : 'info',
              date: m.dateMiseAJour ? new Date(m.dateMiseAJour) : new Date(m.dateCreation || now),
              unread: !readKeys.includes(key),
              link: '/dashboard/agent-missions'
            };
          });

          const mergedMap = new Map<string, AppNotification>();
          localSlaNotifs.forEach(n => mergedMap.set(n.id, n));
          agentNotifs.forEach(n => mergedMap.set(n.id, n));

          this.notifications = Array.from(mergedMap.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
          this.unreadCount = this.notifications.filter(n => n.unread).length;
        },
        error: (err) => console.error('Erreur notifications agent', err)
      });

    } else if (this.userRole.includes('CHEF_EQUIPE')) {
      // --- CONTEXTE CHEF D'EQUIPE ---
      this.reclamationService.getMesMissions(0, 50).subscribe({
        next: (response) => {
          const missions = response.content || [];
          
          const pendingMissions = missions.filter(m => m.statut === 'EN_ATTENTE' || m.statut === 'REOUVERTE');
          
          const chefNotifs: AppNotification[] = pendingMissions.map(m => {
            const key = `chef-${m.numeroReclamation}-${m.statut}`;
            const isReopened = m.statut === 'REOUVERTE';
            return {
              id: key,
              title: isReopened ? 'Réclamation Réouverte' : 'Nouvelle Assignation d\'Équipe',
              message: isReopened 
                ? `La réclamation #${m.numeroReclamation} (« ${m.titre} ») de votre équipe a été réouverte par le client.` 
                : `La réclamation #${m.numeroReclamation} (« ${m.titre} ») a été assignée à votre équipe.`,
              type: isReopened ? 'warning' : 'info',
              date: m.dateMiseAJour ? new Date(m.dateMiseAJour) : new Date(m.dateCreation || now),
              unread: !readKeys.includes(key),
              link: '/dashboard/agent-missions'
            };
          });

          const mergedMap = new Map<string, AppNotification>();
          localSlaNotifs.forEach(n => mergedMap.set(n.id, n));
          chefNotifs.forEach(n => mergedMap.set(n.id, n));

          this.notifications = Array.from(mergedMap.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
          this.unreadCount = this.notifications.filter(n => n.unread).length;
        },
        error: (err) => console.error('Erreur notifications chef equipe', err)
      });

    } else if (this.userRole.includes('SERVICE_MANAGER')) {
      // --- CONTEXTE SERVICE MANAGER ---
      this.reclamationService.getAllReclamations(0, 50).subscribe({
        next: (response) => {
          const allRecs = response.content || [];
          
          const managerRecs = allRecs.filter(r => r.statut === 'EN_ATTENTE' || r.statut === 'REOUVERTE');
          
          const managerNotifs: AppNotification[] = managerRecs.map(r => {
            const key = `manager-${r.numeroReclamation}-${r.statut}`;
            const isReopened = r.statut === 'REOUVERTE';
            return {
              id: key,
              title: isReopened ? 'Alerte Réouverture' : 'Nouvelle Réclamation Soumise',
              message: isReopened 
                ? `La réclamation #${r.numeroReclamation} (« ${r.titre} ») a été réouverte par le client et attend votre réattribution.` 
                : `Une nouvelle réclamation #${r.numeroReclamation} (« ${r.titre} ») a été créée et attend votre assignation.`,
              type: isReopened ? 'warning' : 'info',
              date: r.dateMiseAJour ? new Date(r.dateMiseAJour) : new Date(r.dateCreation || now),
              unread: !readKeys.includes(key),
              link: '/service-manager/dashboard'
            };
          });

          this.notifications = managerNotifs.sort((a, b) => b.date.getTime() - a.date.getTime());
          this.unreadCount = this.notifications.filter(n => n.unread).length;
        },
        error: (err) => console.error('Erreur notifications service manager', err)
      });

    } else if (this.userRole.includes('ADMIN')) {
      // --- CONTEXTE ADMIN ---
      this.reclamationService.getAllReclamations(0, 50).subscribe({
        next: (response) => {
          const allRecs = response.content || [];
          
          const adminRecs = allRecs.filter(r => r.statut === 'EN_ATTENTE' || r.statut === 'REOUVERTE');
          
          const adminNotifs: AppNotification[] = adminRecs.map(r => {
            const key = `admin-${r.numeroReclamation}-${r.statut}`;
            const isReopened = r.statut === 'REOUVERTE';
            return {
              id: key,
              title: isReopened ? 'Réouverture Ticket' : 'Réclamation Créée',
              message: isReopened 
                ? `Le ticket #${r.numeroReclamation} (« ${r.titre} ») a été rouvert par le client.` 
                : `Un nouveau ticket #${r.numeroReclamation} (« ${r.titre} ») a été soumis sur la plateforme.`,
              type: isReopened ? 'warning' : 'info',
              date: r.dateMiseAJour ? new Date(r.dateMiseAJour) : new Date(r.dateCreation || now),
              unread: !readKeys.includes(key),
              link: '/admin/reclamations'
            };
          });

          const mergedMap = new Map<string, AppNotification>();
          localSlaNotifs.forEach(n => mergedMap.set(n.id, n));
          adminNotifs.forEach(n => mergedMap.set(n.id, n));

          this.notifications = Array.from(mergedMap.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
          this.unreadCount = this.notifications.filter(n => n.unread).length;
        },
        error: (err) => console.error('Erreur notifications admin', err)
      });
    }
  }


  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    this.menuOpen = false;
  }

  markAllAsRead(): void {
    const readKeys: string[] = JSON.parse(localStorage.getItem('readNotificationKeys') || '[]');
    this.notifications.forEach(n => {
      n.unread = false;
      if (!readKeys.includes(n.id)) {
        readKeys.push(n.id);
      }
    });
    localStorage.setItem('readNotificationKeys', JSON.stringify(readKeys));
    this.unreadCount = 0;
  }

  onNotificationClick(notif: AppNotification): void {
    notif.unread = false;
    const readKeys: string[] = JSON.parse(localStorage.getItem('readNotificationKeys') || '[]');
    if (!readKeys.includes(notif.id)) {
      readKeys.push(notif.id);
      localStorage.setItem('readNotificationKeys', JSON.stringify(readKeys));
    }
    this.unreadCount = this.notifications.filter(n => n.unread).length;
    this.showNotifications = false;
    
    if (notif.link) {
      this.router.navigate([notif.link]);
    }
  }

  formatNotificationTime(date: Date): string {
    const diffMs = new Date().getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHrs < 24) return `Il y a ${diffHrs} h`;
    
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
}