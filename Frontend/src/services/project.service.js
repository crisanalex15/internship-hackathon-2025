import { api } from './api';

class ProjectService {
  /**
   * Caută proiecte publice
   */
  async searchProjects(query = '') {
    const response = await api.get('/Project/search', {
      params: { query }
    });
    return response.data;
  }

  /**
   * Obține detaliile unui proiect
   */
  async getProject(projectId, password = null) {
    const params = password ? { password } : {};
    const response = await api.get(`/Project/${projectId}`, { params });
    return response.data;
  }

  /**
   * Verifică parola proiectului
   */
  async verifyPassword(projectId, password) {
    const response = await api.post(`/Project/${projectId}/verify-password`, {
      password
    });
    return response.data;
  }

  /**
   * Creează un nou proiect
   */
  async createProject(projectData) {
    const response = await api.post('/Project/create', projectData);
    return response.data;
  }

  /**
   * Actualizează un proiect
   */
  async updateProject(projectId, updateData) {
    const response = await api.put(`/Project/${projectId}`, updateData);
    return response.data;
  }

  /**
   * Șterge un proiect
   */
  async deleteProject(projectId) {
    const response = await api.delete(`/Project/${projectId}`);
    return response.data;
  }

  /**
   * Obține proiectele utilizatorului curent
   */
  async getMyProjects() {
    const response = await api.get('/Project/my-projects');
    return response.data;
  }
}

export default new ProjectService();

