package com.dxc.gdr.Dto.request;

public class CreateReclamationRequest {

    private String titre;
    private String description;
    private String categorie;
    private String priorite;

    public String getTitre() {
        return titre;
    }

    public String getDescription() {
        return description;
    }

    public String getCategorie() {
        return categorie;
    }

    public String getPriorite() {
        return priorite;
    }

    public void setTitre(String titre) {
        this.titre = titre;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setCategorie(String categorie) {
        this.categorie = categorie;
    }

    public void setPriorite(String priorite) {
        this.priorite = priorite;
    }
}