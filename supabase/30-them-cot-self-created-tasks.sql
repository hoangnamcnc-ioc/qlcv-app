-- Việc do NHÂN VIÊN tự tạo (sáng kiến/việc tự phát của cá nhân) — đánh dấu để định tuyến DUYỆT & CHẤM ĐIỂM
-- về Trưởng/Phó phòng (người tạo không được tự duyệt/tự chấm điểm cho mình).
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS self_created boolean DEFAULT false;
