import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReclamationService } from '../../core/services/reclamation.service';
import { Reclamation } from '../../core/models/reclamation.model';
import { ClientNavbarComponent } from '../client-navbar/client-navbar';
import { Sidebar } from '../sidebar/sidebar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-dashboard-client',
  standalone: true,
  imports: [CommonModule, FormsModule, ClientNavbarComponent, Sidebar, TranslateModule],
  templateUrl: './dashboard-client.html',
  styleUrls: ['./dashboard-client.css']
})
export class DashboardClientComponent implements OnInit {

  chatOpen = false;
  chatMessage = '';
  chatMessages: { from: 'bot' | 'user'; text: string; time: string; options?: string[]; actionContext?: string }[] = [];
  reclamations: Reclamation[] = [];

  // Pagination
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  // Details Modal state
  showDetailsModal = false;
  selectedDetails: Reclamation | null = null;

  // Reopen Modal state
  showReopenModal = false;
  reopenMotif = '';
  reopenFile: File | null = null;
  reopeningReclamation: Reclamation | null = null;
  isSubmittingReopen = false;

  constructor(
    private reclamationService: ReclamationService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.translate.get('client_dashboard.chat.welcome').subscribe((res: string) => {
      this.chatMessages = [
        {
          text: res,
          from: 'bot',
          time: this.getCurrentTime()
        }
      ];
    });

    this.loadMyReclamations();
  }

  loadMyReclamations(): void {
    this.reclamationService.getMyReclamations(this.currentPage, this.pageSize).subscribe({
      next: (response) => {
        this.reclamations = response.content || [];
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('DASHBOARD - ERREUR:', err);
        this.reclamations = [];
      }
    });
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadMyReclamations();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadMyReclamations();
    }
  }

  openDetailsModal(rec: Reclamation): void {
    this.selectedDetails = rec;
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.selectedDetails = null;
    this.showDetailsModal = false;
  }

  openReopenModal(rec: Reclamation): void {
    this.reopeningReclamation = rec;
    this.reopenMotif = '';
    this.reopenFile = null;
    this.showReopenModal = true;
  }

  closeReopenModal(): void {
    this.showReopenModal = false;
    this.reopeningReclamation = null;
    this.reopenMotif = '';
    this.reopenFile = null;
  }

  onReopenFileChange(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      this.reopenFile = event.target.files[0];
    } else {
      this.reopenFile = null;
    }
  }

  confirmReouvrir(): void {
    if (!this.reopeningReclamation || !this.reopenMotif.trim() || !this.reopenFile) return;

    this.isSubmittingReopen = true;
    this.reclamationService.reouvrirReclamation(this.reopeningReclamation.numeroReclamation, this.reopenMotif, this.reopenFile)
      .subscribe({
        next: () => {
          this.isSubmittingReopen = false;
          this.closeReopenModal();
          this.loadMyReclamations();
        },
        error: (err) => {
          console.error('Erreur réouverture:', err);
          this.isSubmittingReopen = false;
        }
      });
  }

  downloadReouvertureFile(rec: Reclamation): void {
    if (!rec || !rec.reouvertureAttachmentName) return;
    this.reclamationService.downloadReouvertureAttachment(rec.numeroReclamation).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = rec.reouvertureAttachmentName || 'piece-jointe-reouverture';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Erreur lors du téléchargement de la pièce jointe', err);
      }
    });
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadMyReclamations();
    }
  }

  getStatusClass(statut: string): string {
    if (!statut) return 'status-pending';
    const s = statut.toLowerCase();
    if (s.includes('réouverte') || s.includes('reouverte')) return 'status-reopened';
    if (s.includes('résol') || s.includes('resol') || s.includes('traitee')) return 'status-resolved';
    if (s.includes('rejet')) return 'status-rejected';
    if (s.includes('en cours') || s.includes('en_cours')) return 'status-progress';
    if (s.includes('attente') || s.includes('en_attente')) return 'status-pending';
    return 'status-pending';
  }

  translateStatus(statut: string | undefined): string {
    if (!statut) return '';
    return this.translate.instant('status.' + statut);
  }

  translateCategory(categorie: string | undefined): string {
    if (!categorie) return '';
    return this.translate.instant('categories.' + categorie);
  }

  toggleChat(): void {
    this.chatOpen = !this.chatOpen;
    this.scrollToBottom();
  }

  sendChat(): void {
    const userText = this.chatMessage.trim();
    if (!userText) return;

    this.chatMessages.push({
      text: userText,
      from: 'user',
      time: this.getCurrentTime()
    });

    this.chatMessage = '';
    this.cdr.detectChanges();
    this.scrollToBottom();

    setTimeout(() => {
      this.processBotResponse(userText);
    }, 800);
  }

  processBotResponse(userText: string): void {
    const text = userText.toLowerCase();
    
    let botReplyText = "";
    let botOptions: string[] = [];
    let botContext = "";

    if (text.includes('créer') || text.includes('creer') || text.includes('nouvelle') || text.includes('ajouter') || text.includes('déposer') || text.includes('deposer')) {
      botReplyText = "Pour créer une réclamation, vous devez remplir notre formulaire simplifié. Souhaitez-vous que je vous y redirige tout de suite ?";
      botOptions = ['Oui', 'Non'];
      botContext = 'redirect_create_reclamation';
    } 
    else if (text.includes('réclamation') || text.includes('reclamation') || text.includes('voir') || text.includes('liste') || text.includes('suivi')) {
      botReplyText = "Vous pouvez consulter toutes vos réclamations et leurs statuts directement sur votre tableau de bord. Voulez-vous que je rafraîchisse la liste pour vous ?";
      botOptions = ['Oui', 'Non'];
      botContext = 'refresh_reclamations';
    } 
    else if (text.includes('sla') || text.includes('délai') || text.includes('delai') || text.includes('temps') || text.includes('limite')) {
      botReplyText = "Le SLA (Service Level Agreement) désigne le délai maximum pour résoudre votre demande : 4h pour une réclamation urgente/élevée, 8h pour une priorité moyenne et 24h pour une priorité faible. Est-ce que cette explication vous convient ?";
      botOptions = ['Oui', 'Non'];
      botContext = 'sla_clarity';
    } 
    else if (text.includes('bonjour') || text.includes('salut') || text.includes('hello') || text.includes('hey')) {
      botReplyText = "Bonjour ! Je suis l'assistant virtuel GDR de DXC. 😊 Je suis là pour vous accompagner. Avez-vous besoin d'aide pour déposer ou suivre une réclamation aujourd'hui ?";
      botOptions = ['Oui', 'Non'];
      botContext = 'needs_general_help';
    } 
    else if (text.includes('aide') || text.includes('help') || text.includes('assistance')) {
      botReplyText = "Je peux vous guider pour créer un ticket, consulter l'état de vos réclamations ou vous expliquer les délais SLA. Voulez-vous voir notre guide rapide de création de réclamation ?";
      botOptions = ['Oui', 'Non'];
      botContext = 'show_quick_guide';
    } 
    else {
      botReplyText = "Je n'ai pas tout à fait compris votre demande. Souhaitez-vous voir nos fonctionnalités principales (Créer une réclamation, Consulter vos réclamations, Info SLA) ?";
      botOptions = ['Oui', 'Non'];
      botContext = 'show_main_features';
    }

    this.chatMessages.push({
      text: botReplyText,
      from: 'bot',
      time: this.getCurrentTime(),
      options: botOptions,
      actionContext: botContext
    });

    this.cdr.detectChanges();
    this.scrollToBottom();
  }

  handleOptionClick(option: string, context?: string): void {
    // 1. Add user message showing their click
    this.chatMessages.push({
      text: option,
      from: 'user',
      time: this.getCurrentTime()
    });
    this.cdr.detectChanges();
    this.scrollToBottom();

    // 2. Process choice contextually
    setTimeout(() => {
      let botReplyText = "";
      let botOptions: string[] = [];
      let nextContext = "";

      const isYes = option.toLowerCase() === 'oui';

      if (context === 'redirect_create_reclamation') {
        if (isYes) {
          botReplyText = "Très bien ! Je vous redirige immédiatement vers le formulaire de création.";
          setTimeout(() => {
            this.router.navigate(['/mes-reclamations/nouvelle']);
          }, 1000);
        } else {
          botReplyText = "Compris. Je reste ici. Avez-vous d'autres questions ?";
          botOptions = ['Oui', 'Non'];
          nextContext = 'other_needs';
        }
      } 
      else if (context === 'refresh_reclamations') {
        if (isYes) {
          this.loadMyReclamations();
          botReplyText = "C'est fait ! La liste de vos réclamations a été mise à jour avec succès. Tout semble-t-il correct ?";
          botOptions = ['Oui', 'Non'];
          nextContext = 'other_needs_positive';
        } else {
          botReplyText = "D'accord, pas de soucis. N'hésitez pas si vous avez une question sur une réclamation particulière !";
        }
      } 
      else if (context === 'sla_clarity') {
        if (isYes) {
          botReplyText = "Génial ! Je suis ravi que ce soit clair. Avez-vous besoin d'aide pour autre chose ?";
          botOptions = ['Oui', 'Non'];
          nextContext = 'other_needs';
        } else {
          botReplyText = "Je comprends. Si vous le souhaitez, je peux transmettre une alerte à nos équipes de support pour qu'un conseiller vous recontacte. Voulez-vous que je le fasse ?";
          botOptions = ['Oui', 'Non'];
          nextContext = 'contact_support';
        }
      } 
      else if (context === 'needs_general_help') {
        if (isYes) {
          botReplyText = "Parfait ! Posez-moi simplement votre question (ex: 'Comment créer un ticket ?' ou 'Qu'est-ce que le SLA ?').";
        } else {
          botReplyText = "Entendu, je reste disponible si vous changez d'avis. Bonne navigation !";
        }
      } 
      else if (context === 'show_quick_guide') {
        if (isYes) {
          botReplyText = "Guide rapide :\n1. Cliquez sur 'Nouvelle réclamation'.\n2. Saisissez votre titre et décrivez votre problème.\n3. Joignez un fichier facultatif.\n4. Cliquez sur 'Créer'.\nEst-ce que cela vous aide ?";
          botOptions = ['Oui', 'Non'];
          nextContext = 'other_needs';
        } else {
          botReplyText = "D'accord, dites-moi directement comment je peux vous être utile.";
        }
      } 
      else if (context === 'show_main_features') {
        if (isYes) {
          botReplyText = "Excellent ! Pour lancer une action, vous pouvez par exemple taper :\n- 'Créer une réclamation'\n- 'Voir mes tickets'\n- 'Explique-moi le SLA'\nQue souhaitez-vous faire en premier ?";
        } else {
          botReplyText = "Entendu. N'hésitez pas à taper votre message librement !";
        }
      } 
      else if (context === 'contact_support') {
        if (isYes) {
          botReplyText = "C'est enregistré ! J'ai envoyé une notification prioritaire à notre Service Manager pour un suivi rapide. Un conseiller vous recontactera sous peu. Avez-vous besoin de faire autre chose ?";
          botOptions = ['Oui', 'Non'];
          nextContext = 'other_needs';
        } else {
          botReplyText = "Très bien, pas de soucis. Je reste à votre entière disposition !";
        }
      } 
      else if (context === 'other_needs_positive') {
        if (isYes) {
          botReplyText = "Super ! Je vous souhaite une excellente journée. N'hésitez pas si vous avez d'autres demandes.";
        } else {
          botReplyText = "Mince ! N'hésitez pas à me décrire le problème rencontré ou à contacter notre support.";
          botOptions = ['Oui', 'Non'];
          nextContext = 'contact_support';
        }
      } 
      else if (context === 'other_needs') {
        if (isYes) {
          botReplyText = "D'accord, posez-moi votre question ou décrivez ce dont vous avez besoin.";
        } else {
          botReplyText = "Parfait. Merci d'utiliser le support DXC ! Passez une excellente journée ! 😊";
        }
      } 
      else {
        botReplyText = "D'accord. Avez-vous d'autres questions ?";
        botOptions = ['Oui', 'Non'];
        nextContext = 'other_needs';
      }

      this.chatMessages.push({
        text: botReplyText,
        from: 'bot',
        time: this.getCurrentTime(),
        options: botOptions,
        actionContext: nextContext
      });

      this.cdr.detectChanges();
      this.scrollToBottom();
    }, 800);
  }

  scrollToBottom(): void {
    setTimeout(() => {
      const body = document.querySelector('.chat-body');
      if (body) {
        body.scrollTop = body.scrollHeight;
      }
    }, 100);
  }

  onCreateReclamation(): void {
    this.router.navigate(['/mes-reclamations/nouvelle']);
  }

  private getCurrentTime(): string {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  }
}