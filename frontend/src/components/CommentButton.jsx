
const CommentButton = ({ count, onClick, hasCommented }) => {
  return (
    <button 
      data-cy="comment-button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={`flex items-center space-x-1 group transition-colors ${
        hasCommented ? 'text-blue-500' : 'text-gray-500 hover:text-blue-400'
      }`}
      type="button"
    >
      <div data-cy="comment-icon" className="p-2 group-hover:bg-blue-400/10 rounded-full transition-colors">
        <svg 
          viewBox="0 0 24 24" 
          width="18" 
          height="18" 
          fill="currentColor"
        >
          <path d="M1.751 10c0-4.42 3.584-8 7.999-8s8.001 3.58 8.001 8c0 2.64-1.28 4.98-3.27 6.42l2.31 4.24c.22.4-.07.9-.53.9h-2.12l-3.3-6.05c-.35.05-.71.08-1.09.08-4.415 0-7.999-3.58-7.999-8z"></path>
        </svg>
      </div>
      
      <span data-cy="comment-count" className="text-sm font-medium">
        {count > 0 ? count : ""}
      </span>
    </button>
  );
};

export default CommentButton;
