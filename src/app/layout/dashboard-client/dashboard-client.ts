import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReclamationService } from '../../core/services/reclamation.service';
import { ChatbotService } from '../../core/services/chatbot.service';
import { Reclamation } from '../../core/models/reclamation.model';
import { ClientNavbarComponent } from '../client-navbar/client-navbar';
import { Sidebar } from '../sidebar/sidebar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

type ChatFrom = 'bot' | 'user';

interface ChatAction {
  label: string;
  type: 'DETAILS' | 'MODIFY' | 'CONTACT_AGENT';
  reclamation?: Reclamation;
}

interface ChatMessage {
  text: string;
  from: 'bot' | 'user';
  time: string;
  actions?: ChatAction[];
}

@Component({
  selector: 'app-dashboard-client',
  standalone: true,
  imports: [CommonModule, FormsModule, ClientNavbarComponent, Sidebar, TranslateModule],
  templateUrl: './dashboard-client.html',
  styleUrls: ['./dashboard-client.css']
})
export class DashboardClientComponent implements OnInit {

  chatOpen = true;
  chatMessage = '';
  isChatLoading = false;
  reclamations: Reclamation[] = [];
  pendingContactReclamation: Reclamation | null = null;

  chatMessages: ChatMessage[] = [];

  constructor(
    private reclamationService: ReclamationService,
    private chatbotService: ChatbotService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.chatMessages = [
      {
        text: this.t('chatbot.welcome', {}, 'Bonjour 👋 Je suis votre assistant GDR. Je peux vous aider à suivre vos réclamations, consulter leur statut ou contacter l’équipe concernée.'),
        from: 'bot',
        time: this.getCurrentTime()
      }
    ];

    this.loadReclamations();
  }

  loadReclamations(): void {
    this.reclamationService.getMyReclamations().subscribe({
      next: (data) => {
        this.reclamations = data || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.reclamations = [];
      }
    });
  }

  sendChat(): void {
    const message = this.chatMessage.trim();
    if (!message || this.isChatLoading) return;

    this.addUserMessage(message);
    this.chatMessage = '';

    const smart = this.getSmartAnswer(message);

    if (smart) {
  const numero = this.extractReclamationNumber(message);
  const rec = numero ? this.findReclamationByNumber(numero) : this.getLatestReclamation();

  this.addBotMessage(smart, this.getDefaultActions(rec));
  return;
}

    this.isChatLoading = true;

    this.chatMessages.push({
      text: this.t('chatbot.loading', {}, 'L’assistant réfléchit...'),
      from: 'bot',
      time: this.getCurrentTime()
    });

    const index = this.chatMessages.length - 1;

    this.chatbotService.ask(message).subscribe({
      next: (res) => {
        this.chatMessages[index] = {
          text: res.response,
          from: 'bot',
          time: this.getCurrentTime()
        };
        this.isChatLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.chatMessages[index] = {
          text: this.t('chatbot.error', {}, 'Le chatbot est momentanément indisponible.'),
          from: 'bot',
          time: this.getCurrentTime()
        };
        this.isChatLoading = false;
      }
    });
  }

  getSmartAnswer(message: string): string | null {
    const msg = this.normalize(message);

    const numero = this.extractReclamationNumber(message);
    const selectedRec = numero ? this.findReclamationByNumber(numero) : this.getLatestReclamation();

    if (this.isGreeting(msg)) {
      return this.t('chatbot.greeting', {}, 'Bonjour 👋 Comment puis-je vous aider concernant vos réclamations ?');
    }

    if (this.isThanks(msg)) {
      return this.t('chatbot.thanks', {}, 'Avec plaisir 😊 Je reste disponible pour vous aider.');
    }

    if (this.pendingContactReclamation && this.isConfirmation(msg)) {
      return this.confirmContactAgent(this.pendingContactReclamation);
    }

    if (numero && !selectedRec) {
      return this.t(
        'chatbot.claim_not_found',
        { numero },
        `Je ne trouve pas la réclamation ${numero} parmi vos réclamations. Veuillez vérifier le numéro.`
      );
    }

    if (this.hasAny(msg, ['statut', 'etat', 'suivre', 'suivi', 'ou en est', 'où en est'])) {
      return this.answerStatus(selectedRec);
    }

    if (this.hasAny(msg, ['modifier', 'changer', 'corriger', 'editer', 'éditer'])) {
      return this.answerModify(selectedRec);
    }

    if (this.hasAny(msg, ['agent', 'conseiller', 'humain', 'support', 'aide', 'bloque', 'bloqué', 'probleme', 'problème', 'contacter', 'communication', 'parler'])) {
      return this.answerContactAgent(selectedRec);
    }

    if (this.hasAny(msg, ['rejet', 'rejetee', 'rejetée', 'refus'])) {
      return this.answerRejected(selectedRec);
    }

    if (this.hasAny(msg, ['creer', 'créer', 'nouvelle reclamation', 'nouvelle réclamation'])) {
      return this.t(
        'chatbot.create_claim_help',
        {},
        'Vous pouvez créer une nouvelle réclamation en cliquant sur le bouton “Créer une réclamation”.'
      );
    }

    const statusFilter = this.detectStatusFromMessage(msg);
    if (statusFilter) {
      return this.answerListByStatus(statusFilter, msg);
    }

    const categoryFilter = this.detectCategoryFromMessage(msg);
    if (categoryFilter) {
      return this.answerListByCategory(categoryFilter, msg);
    }

    if (this.hasAny(msg, ['mes reclamations', 'mes réclamations', 'liste', 'tickets', 'demandes'])) {
      return this.answerAllReclamations(msg);
    }

    return null;
  }

  answerStatus(rec: Reclamation | null): string {
    if (!this.reclamations.length) {
      return this.t('chatbot.no_claims', {}, 'Vous n’avez aucune réclamation.');
    }

    if (!rec) {
      return this.answerAllReclamations('') + '\n\n' +
        this.t('chatbot.ask_claim_number', {}, 'Veuillez préciser le numéro de la réclamation concernée.');
    }

    return [
      this.t('chatbot.status_intro', { numero: rec.numeroReclamation }, `Voici l’état de votre réclamation ${rec.numeroReclamation} :`),
      '',
      `• ${this.t('chatbot.fields.subject', {}, 'Objet')} : ${rec.titre || '-'}`,
      `• ${this.t('chatbot.fields.status', {}, 'Statut')} : ${this.translateStatus(rec.statut)}`,
      `• ${this.t('chatbot.fields.category', {}, 'Catégorie')} : ${this.translateCategory(rec.categorie)}`,
      `• ${this.t('chatbot.fields.priority', {}, 'Priorité')} : ${(rec as any).priorite || '-'}`,
      `• ${this.t('chatbot.fields.team', {}, 'Équipe')} : ${(rec as any).equipeAssignee || 'Non renseignée'}`,
      `• ${this.t('chatbot.fields.agent', {}, 'Agent')} : ${(rec as any).agentAssigne || (rec as any).agentNom || 'Non renseigné'}`,
      `• SLA : ${(rec as any).slaStatus || 'Non renseigné'}`
    ].join('\n');
  }

  answerModify(rec: Reclamation | null): string {
    if (!this.reclamations.length) {
      return this.t('chatbot.no_claims', {}, 'Vous n’avez aucune réclamation.');
    }

    if (!rec) {
      return this.t('chatbot.ask_claim_number', {}, 'Veuillez préciser le numéro de la réclamation concernée.');
    }

    if (rec.statut === 'EN_ATTENTE') {
      return this.t(
        'chatbot.modify_possible',
        { numero: rec.numeroReclamation },
        `Votre réclamation ${rec.numeroReclamation} est encore en attente. Vous pouvez demander une modification ou créer une nouvelle réclamation avec les informations corrigées.`
      );
    }

    if (rec.statut === 'EN_COURS') {
      this.pendingContactReclamation = rec;
      return this.t(
        'chatbot.modify_blocked',
        { numero: rec.numeroReclamation },
        `Votre réclamation ${rec.numeroReclamation} est déjà en cours de traitement. La modification directe n’est plus disponible. Souhaitez-vous contacter l’équipe en charge ?`
      );
    }

    if (rec.statut === 'TRAITEE') {
      return this.t(
        'chatbot.modify_completed',
        { numero: rec.numeroReclamation },
        `Votre réclamation ${rec.numeroReclamation} est déjà traitée. Elle ne peut plus être modifiée. Vous pouvez créer une nouvelle réclamation si nécessaire.`
      );
    }

    if (rec.statut === 'REJETEE') {
      return this.answerRejected(rec);
    }

    return this.t(
      'chatbot.modify_generic',
      { numero: rec.numeroReclamation },
      `Pour modifier la réclamation ${rec.numeroReclamation}, je vous recommande de contacter l’équipe concernée.`
    );
  }

  answerContactAgent(rec: Reclamation | null): string {
    if (!this.reclamations.length) {
      return this.t(
        'chatbot.no_claims_contact',
        {},
        'Je ne trouve aucune réclamation liée à votre compte. Veuillez créer une réclamation afin qu’une équipe puisse la prendre en charge.'
      );
    }

    if (!rec) {
      return this.answerAllReclamations('') + '\n\n' +
        this.t('chatbot.ask_claim_number_contact', {}, 'Pour vous connecter à la bonne équipe, veuillez préciser le numéro de la réclamation.');
    }

    this.pendingContactReclamation = rec;

    return [
      this.t('chatbot.contact_intro', { numero: rec.numeroReclamation }, `Votre réclamation ${rec.numeroReclamation} est liée aux informations suivantes :`),
      '',
      `• ${this.t('chatbot.fields.team', {}, 'Équipe')} : ${(rec as any).equipeAssignee || 'Non renseignée'}`,
      `• ${this.t('chatbot.fields.agent', {}, 'Agent')} : ${(rec as any).agentAssigne || (rec as any).agentNom || 'Non renseigné'}`,
      `• ${this.t('chatbot.fields.status', {}, 'Statut')} : ${this.translateStatus(rec.statut)}`,
      '',
      this.t(
        'chatbot.contact_confirm_question',
        {},
        'Souhaitez-vous que je transmette une demande de contact à l’équipe en charge ? Répondez par “oui”.'
      )
    ].join('\n');
  }

  confirmContactAgent(rec: Reclamation): string {
    this.pendingContactReclamation = null;

    return this.t(
      'chatbot.contact_confirmed',
      {
        numero: rec.numeroReclamation,
        equipe: (rec as any).equipeAssignee || 'assignée'
      },
      `Votre demande de contact concernant la réclamation ${rec.numeroReclamation} a bien été prise en compte. L’équipe ${(rec as any).equipeAssignee || 'assignée'} sera invitée à revenir vers vous.`
    );
  }

  answerRejected(rec: Reclamation | null): string {
    if (!rec) {
      return this.t('chatbot.ask_rejected_number', {}, 'Veuillez préciser le numéro de la réclamation rejetée.');
    }

    return [
      this.t('chatbot.rejected_intro', { numero: rec.numeroReclamation }, `Votre réclamation ${rec.numeroReclamation} est rejetée.`),
      '',
      `${this.t('chatbot.fields.reason', {}, 'Motif')} : ${(rec as any).motifRefus || (rec as any).motifRejet || 'Motif non renseigné'}`,
      '',
      this.t('chatbot.rejected_advice', {}, 'Vous pouvez créer une nouvelle réclamation en corrigeant les informations nécessaires.')
    ].join('\n');
  }

  answerListByStatus(status: string, msg: string): string {
    const list = this.reclamations.filter(r => r.statut === status);

    if (!list.length) {
      return this.t(
        'chatbot.no_claims_by_status',
        { statut: this.translateStatus(status) },
        `Aucune réclamation ${this.translateStatus(status).toLowerCase()} trouvée.`
      );
    }

    if (this.hasAny(msg, ['id', 'ids', 'numero', 'numéro'])) {
      return this.t(
        'chatbot.claim_ids_by_status',
        {
          statut: this.translateStatus(status),
          ids: list.map(r => r.numeroReclamation).join(', ')
        },
        `Voici les IDs des réclamations ${this.translateStatus(status).toLowerCase()} : ${list.map(r => r.numeroReclamation).join(', ')}`
      );
    }

    return [
      this.t(
        'chatbot.claims_by_status_intro',
        { statut: this.translateStatus(status) },
        `Voici vos réclamations ${this.translateStatus(status).toLowerCase()} :`
      ),
      '',
      ...list.map(r => `• ${r.numeroReclamation} - ${r.titre} (${this.translateStatus(r.statut)})`)
    ].join('\n');
  }

  answerListByCategory(category: string, msg: string): string {
    const list = this.reclamations.filter(r => r.categorie === category);

    if (!list.length) {
      return this.t(
        'chatbot.no_claims_by_category',
        { categorie: this.translateCategory(category) },
        `Aucune réclamation de catégorie ${this.translateCategory(category)} trouvée.`
      );
    }

    if (this.hasAny(msg, ['id', 'ids', 'numero', 'numéro'])) {
      return this.t(
        'chatbot.claim_ids_by_category',
        {
          categorie: this.translateCategory(category),
          ids: list.map(r => r.numeroReclamation).join(', ')
        },
        `Voici les IDs des réclamations ${this.translateCategory(category)} : ${list.map(r => r.numeroReclamation).join(', ')}`
      );
    }

    return [
      this.t(
        'chatbot.claims_by_category_intro',
        { categorie: this.translateCategory(category) },
        `Voici vos réclamations de catégorie ${this.translateCategory(category)} :`
      ),
      '',
      ...list.map(r => `• ${r.numeroReclamation} - ${r.titre} (${this.translateStatus(r.statut)})`)
    ].join('\n');
  }

  answerAllReclamations(msg: string): string {
    if (!this.reclamations.length) {
      return this.t('chatbot.no_claims', {}, 'Vous n’avez aucune réclamation.');
    }

    if (this.hasAny(msg, ['id', 'ids', 'numero', 'numéro'])) {
      return this.t(
        'chatbot.all_claim_ids',
        { ids: this.reclamations.map(r => r.numeroReclamation).join(', ') },
        `Voici les IDs de vos réclamations : ${this.reclamations.map(r => r.numeroReclamation).join(', ')}`
      );
    }

    return [
      this.t('chatbot.all_claims_intro', {}, 'Voici vos réclamations récentes :'),
      '',
      ...this.reclamations
        .slice(0, 5)
        .map(r => `• ${r.numeroReclamation} - ${r.titre} (${this.translateStatus(r.statut)})`)
    ].join('\n');
  }

  detectStatusFromMessage(msg: string): string | null {
    if (msg.includes('en cours')) return 'EN_COURS';
    if (msg.includes('traite') || msg.includes('traité') || msg.includes('traitée') || msg.includes('resolu') || msg.includes('résolu')) return 'TRAITEE';
    if (msg.includes('rejet') || msg.includes('refus')) return 'REJETEE';
    if (msg.includes('attente')) return 'EN_ATTENTE';
    return null;
  }

  detectCategoryFromMessage(msg: string): string | null {
    if (msg.includes('projet')) return 'PROJET';
    if (msg.includes('maintenance')) return 'MAINTENANCE';
    if (msg.includes('technique')) return 'TECHNIQUE';
    if (msg.includes('facturation')) return 'FACTURATION';
    if (msg.includes('service')) return 'SERVICE';
    if (msg.includes('autre')) return 'AUTRE';
    return null;
  }

  extractReclamationNumber(message: string): string | null {
    const match = message.match(/REC-\d{4}-\d{4}/i);
    return match ? match[0].toUpperCase() : null;
  }

  findReclamationByNumber(numero: string): Reclamation | null {
    return this.reclamations.find(r =>
      r.numeroReclamation?.toUpperCase() === numero.toUpperCase()
    ) || null;
  }

  getLatestReclamation(): Reclamation | null {
    if (!this.reclamations.length) return null;

    return [...this.reclamations].sort((a: any, b: any) => {
      return new Date(b.dateCreation || 0).getTime() - new Date(a.dateCreation || 0).getTime();
    })[0];
  }

  normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  hasAny(message: string, keywords: string[]): boolean {
    return keywords.some(k => message.includes(this.normalize(k)));
  }

  isGreeting(message: string): boolean {
    return this.hasAny(message, ['bonjour', 'salut', 'hello', 'bonsoir']);
  }

  isThanks(message: string): boolean {
    return this.hasAny(message, ['merci', 'thanks', 'thank you']);
  }

  isConfirmation(message: string): boolean {
    return this.hasAny(message, ['oui', 'ok', 'daccord', 'd’accord', 'yes']);
  }

  addUserMessage(text: string): void {
    this.chatMessages.push({
      text,
      from: 'user',
      time: this.getCurrentTime()
    });
  }

 addBotMessage(text: string, actions: ChatAction[] = []): void {
  this.chatMessages.push({
    text,
    from: 'bot',
    time: this.getCurrentTime(),
    actions
  });

  this.cdr.detectChanges();
}
getDefaultActions(rec: Reclamation | null): ChatAction[] {
  if (!rec) return [];

  const actions: ChatAction[] = [
    {
      label: this.t('chatbot.actions.view_details', {}, 'Voir détails'),
      type: 'DETAILS',
      reclamation: rec
    },
    {
      label: this.t('chatbot.actions.contact_agent', {}, 'Parler à l’agent'),
      type: 'CONTACT_AGENT',
      reclamation: rec
    }
  ];

  if (rec.statut === 'EN_ATTENTE') {
    actions.unshift({
      label: this.t('chatbot.actions.modify_claim', {}, 'Modifier'),
      type: 'MODIFY',
      reclamation: rec
    });
  }

  return actions;
}
handleChatAction(action: ChatAction): void {
  const rec = action.reclamation;

  if (!rec) return;

  if (action.type === 'DETAILS') {
    this.addBotMessage(
      [
        `Réclamation : ${rec.numeroReclamation}`,
        `Objet : ${rec.titre}`,
        `Statut : ${this.translateStatus(rec.statut)}`,
        `Catégorie : ${this.translateCategory(rec.categorie)}`,
        `Priorité : ${(rec as any).priorite || '-'}`,
        `Équipe : ${(rec as any).equipeAssignee || 'Non renseignée'}`
      ].join('\n')
    );
  }

  if (action.type === 'MODIFY') {
    if (rec.statut === 'EN_ATTENTE') {
      this.router.navigate(['/mes-reclamations/modifier', rec.numeroReclamation]);
    } else {
      this.addBotMessage(
        `La réclamation ${rec.numeroReclamation} ne peut plus être modifiée car elle est déjà ${this.translateStatus(rec.statut)}.`
      );
    }
  }

  if (action.type === 'CONTACT_AGENT') {
    this.pendingContactReclamation = rec;

    this.addBotMessage(
      [
        `Votre demande de contact concerne la réclamation ${rec.numeroReclamation}.`,
        `Équipe : ${(rec as any).equipeAssignee || 'Non renseignée'}`,
        `Agent : ${(rec as any).agentAssigne || (rec as any).agentNom || 'Non renseigné'}`,
        '',
        `Souhaitez-vous confirmer la demande de contact ? Répondez par “oui”.`
      ].join('\n')
    );
  }
}

  getStatusClass(statut: string | undefined): string {
    if (!statut) return 'status-pending';

    const s = statut.toLowerCase();

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
  }

  onCreateReclamation(): void {
    this.router.navigate(['/mes-reclamations/nouvelle']);
  }

  private getCurrentTime(): string {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  }

  private t(key: string, params: any = {}, fallback: string = ''): string {
    const value = this.translate.instant(key, params);
    return value === key ? fallback : value;
  }
}