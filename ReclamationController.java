package com.dxc.gdr.controller;

import com.dxc.gdr.Dto.request.CreateReclamationRequest;
import com.dxc.gdr.Dto.response.ReclamationResponse;
import com.dxc.gdr.Dto.response.ReclamationStatusResponse;
import com.dxc.gdr.service.ReclamationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reclamations")

public class ReclamationController {

    private final ReclamationService reclamationService;
    public ReclamationController(ReclamationService reclamationService) {
        this.reclamationService = reclamationService;
    }
    @PostMapping
    @PreAuthorize("hasRole('CLIENT')")
    public ReclamationResponse createReclamation(@Valid @RequestBody CreateReclamationRequest request,
                                                 Authentication authentication) {
        return reclamationService.createReclamation(request, authentication.getName());
    }

    @GetMapping("/mes-reclamations")
    @PreAuthorize("hasRole('CLIENT')")
    public List<ReclamationResponse> getMyReclamations(Authentication authentication) {
        return reclamationService.getMyReclamations(authentication.getName());
    }

    @GetMapping("/{numeroReclamation}/statut")
    @PreAuthorize("hasRole('CLIENT')")
    public ReclamationStatusResponse getReclamationStatus(@PathVariable String numeroReclamation,
                                                          Authentication authentication) {
        return reclamationService.getReclamationStatus(numeroReclamation, authentication.getName());
    }
}