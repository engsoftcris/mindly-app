import { useState } from 'react';
import { api } from '../api/axios';
import { toast } from 'react-toastify';

const PostActions = ({ post, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);

  const handleUpdate = async () => {
    try {
      const response = await api.patch(`/posts/${post.id}/`, { content: editContent });
      toast.success("Post enviado para revisão!");
      setIsEditing(false);
      onUpdate(response.data); // Atualiza o estado no componente pai
    } catch (error) {
      toast.error("Erro ao editar post.");
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Tem certeza que deseja excluir este post?")) {
      try {
        await api.delete(`/posts/${post.id}/`);
        toast.info("Post excluído.");
        onDelete(post.id);
      } catch (error) {
        toast.error("Não foi possível excluir.");
      }
    }
  };

  return (
    <div className="post-controls">
      {isEditing ? (
        <>
          <textarea 
            value={editContent} 
            onChange={(e) => setEditContent(e.target.value)}
            className="edit-textarea"
          />
          <button onClick={handleUpdate}>Salvar</button>
          <button onClick={() => setIsEditing(false)}>Cancelar</button>
        </>
      ) : (
        <>
          <button onClick={() => setIsEditing(true)}>Editar</button>
          <button onClick={handleDelete} style={{ color: 'red' }}>Excluir</button>
        </>
      )}
    </div>
  );
};