-- ============================================================================
-- To_Done · 待办事项管理系统 —— 数据库建表脚本
-- ----------------------------------------------------------------------------
-- 适用数据库：PostgreSQL 18
-- 对应文档  ：数据库设计说明书 · 第 8 章 建表脚本（此处不写版本号，文档进位时无需同步本行）
--
-- 全库约定
--   1. 主键统一 UUID + DEFAULT uuidv7()。uuidv7 由 PostgreSQL 18 内置，生成的值按
--      时间有序，插入始终落在索引右端，不会像随机 UUID 那样产生索引页分裂。
--   2. 不建任何外键。引用完整性由应用层保证（用户注销不删数据；只有回收站到期清理
--      会物理删除任务及其配图），换来无跨表锁的写入与按用户归档、迁移的便利。
--   3. 软删除：task.deleted_at 非空即「在回收站中」，业务查询恒定带 deleted_at 条件；
--      回收站里的任务保留 90 天，到期由应用定时任务物理删除（连同 MinIO 对象与元数据）。
--   4. 五张表互不依赖（无外键），执行顺序任意。
--   5. 时间列统一 TIMESTAMP（不含时区）：应用与数据库同机同容器、统一 Asia/Shanghai。
--   6. **库里不写 CHECK**：status / priority 的取值、sort_order 的范围一律由后端枚举与
--      入参校验保证（改枚举值不必再动 DDL）。保留 NOT NULL 与 UNIQUE——那是结构与唯一性，
--      与"业务取值"不在同一层级，交给数据库更划算。
--   7. 自动清理只有一个：回收站超期任务由定时任务（每天 03:30）物理删除；
--      其余数据一律不自动删除（图片没有临时态、验证码靠 Redis 的 TTL 自己消失）。
--   8. 验证码不落库：图形验证码与邮箱验证码都存 Redis（TTL 自动过期 + Lua 原子消费），见系统说明书 7.5。
--   9. 管理员独立：管理员存 admin_user，与 app_user **没有任何关联**（不建外键、不共享登录态）。
--      管理员对用户的所有操作（冻结 / 解冻 / 注销 / 改资料 / 重置密码）都只写 app_user，不改本表的其它表。
--
-- 脚本结构说明
--   · CREATE TABLE  —— 建表，列定义右侧的 -- 是阅读用注释，不会写进数据库
--   · COMMENT ON    —— 数据库级注释，执行后可用 \d+ 表名 查看，与上面的 -- 相互独立
--   · CREATE INDEX  —— 索引，注释写在语句上方
-- ============================================================================


-- ============================================================================
-- 表 1/5：app_user —— 用户
-- 一个注册账号一行。**登录凭证只有邮箱**（唯一，仅未注销行）；name 只是显示名、不唯一，
-- phone 可选、非空时唯一（本期不用于登录）。
-- 头像不在这张表：单独存 user_avatar（见 表 3/5）。
-- 冻结（管理员操作）用 frozen_at 表达：非空即冻结，登录被拒、已签发 token 立即失效。
-- 注销（管理员操作）用 deleted_at 表达：软删除，登录被拒、token 立即失效，**且不可恢复**；
-- 任务 / 配图 / 头像与 email / phone 的**原值全部保留**（不做占位改写），
-- 但唯一键立即释放——同一个邮箱 / 手机号可以被重新注册或绑定。
-- ============================================================================
CREATE TABLE app_user
(
    id                  UUID         PRIMARY KEY DEFAULT uuidv7(),   -- 主键，UUID v7（时间有序）
    name                VARCHAR(64)  NOT NULL,                       -- 显示名，**不唯一**：系统无社交，它只是称呼
    email               VARCHAR(128) NOT NULL,                       -- 登录凭证；未注销的行之间唯一；统一小写存储
    phone               VARCHAR(32),                                 -- 手机号，可为空；非空时未注销的行之间唯一（暂不用于登录）
    password            VARCHAR(128) NOT NULL,                       -- 密码，BCrypt 密文（长度留有余量以便换算法）
    frozen_at           TIMESTAMP,                                   -- 冻结时间，非空即「账号被管理员冻结」
    frozen_reason       VARCHAR(128),                                -- 冻结原因，展示给被冻结的用户；可为空
    deleted_at          TIMESTAMP,                                   -- 注销时间（软删除），非空即「账号已注销」
    password_updated_at TIMESTAMP    NOT NULL DEFAULT now(),         -- 密码最后修改时间；签发早于此值的 token 直接失效
    created_at          TIMESTAMP    NOT NULL DEFAULT now(),         -- 创建时间
    updated_at          TIMESTAMP    NOT NULL DEFAULT now()          -- 更新时间，由应用在每次更新时写入
    -- 这里刻意不写 UNIQUE 约束：唯一性由下面的两条部分唯一索引表达（只约束未注销的行）
);

-- 字段注释：写进数据库元数据，执行后 \d+ app_user 即可看到（与上面的 -- 注释相互独立）
COMMENT ON TABLE  app_user                     IS '用户';
COMMENT ON COLUMN app_user.id                  IS '主键，UUID v7（时间有序）';
COMMENT ON COLUMN app_user.name                IS '显示名，不唯一；注册时必填，登录不使用';
COMMENT ON COLUMN app_user.email               IS '登录凭证，唯一（仅未注销行）；统一小写存储';
COMMENT ON COLUMN app_user.phone               IS '手机号，可为空；非空时唯一（仅未注销行）；本期不用于登录';
COMMENT ON COLUMN app_user.password            IS 'BCrypt 密文';
COMMENT ON COLUMN app_user.frozen_at           IS '冻结时间，非空即「账号被管理员冻结」';
COMMENT ON COLUMN app_user.frozen_reason       IS '冻结原因，可为空；登录被拒时展示给用户';
COMMENT ON COLUMN app_user.deleted_at          IS '注销时间（软删除），非空即「账号已注销」，不可恢复；邮箱与手机号随之释放，任务与图片保留';
COMMENT ON COLUMN app_user.password_updated_at IS '密码最后修改时间；签发时间早于此值的 token 视为失效';
COMMENT ON COLUMN app_user.created_at          IS '创建时间';
COMMENT ON COLUMN app_user.updated_at          IS '更新时间';

-- 索引：邮箱与手机号**只在未注销的行之间唯一**（部分唯一索引）。
-- 注销后立即释放：同一个邮箱 / 手机号可以被重新注册或绑定，而注销行里的原值**原样保留、不做占位改写**。
-- 用户名不建任何索引：它只是显示名，不参与登录、也不参与判重（系统无社交场景）。
-- 应用层查重（注册、换邮箱、填手机号）**必须带 deleted_at IS NULL**，否则会把已注销账号误判为占用。
CREATE UNIQUE INDEX uk_app_user_email ON app_user (email) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uk_app_user_phone ON app_user (phone) WHERE deleted_at IS NULL;


-- ============================================================================
-- 表 2/4：task —— 待办任务
-- 系统的主表。查询恒定以 (user_id, deleted_at) 为入口，索引据此设计。
-- 状态流转：TODO → IN_PROGRESS → DONE；DONE 可回退为 TODO。
-- 时间列只有 recorded_at / completed_at / deleted_at：**没有 updated_at**（也没有 created_at）。
-- 编辑任务时由用户决定是否把 recorded_at 刷成当前时间（默认刷新）；列表按它倒序，刷新即置顶。
-- ============================================================================
CREATE TABLE task
(
    id           UUID         PRIMARY KEY DEFAULT uuidv7(),   -- 主键，UUID v7（时间有序）
    user_id      UUID         NOT NULL,                       -- 归属用户（无外键，应用层保证）
    title        VARCHAR(128) NOT NULL,                       -- 任务标题
    description  TEXT,                                        -- 任务描述，可为空
    status       VARCHAR(32)  NOT NULL DEFAULT 'TODO',        -- 状态，默认待办；取值由后端 TaskStatus 枚举保证
    priority     VARCHAR(32)  NOT NULL DEFAULT 'MEDIUM',      -- 优先级，默认中；取值由后端 TaskPriority 枚举保证
    due_date     TIMESTAMP,                                   -- 截止时间，可为空
    completed_at TIMESTAMP,                                   -- 完成时间，仅 DONE 状态有值
    deleted_at   TIMESTAMP,                                   -- 软删除时间，非空即「在回收站中」
    recorded_at  TIMESTAMP    NOT NULL DEFAULT now()          -- 记录时间：创建时写入，编辑时可刷新（无 updated_at）
    -- 不写 CHECK：status 三选一、priority 四选一由后端枚举 + 入参校验保证（见文件头约定 6）
);

COMMENT ON TABLE  task              IS '待办任务';
COMMENT ON COLUMN task.id           IS '主键，UUID v7（时间有序）';
COMMENT ON COLUMN task.user_id      IS '归属用户（无外键，应用层保证）';
COMMENT ON COLUMN task.title        IS '任务标题';
COMMENT ON COLUMN task.description  IS '任务描述，可为空';
COMMENT ON COLUMN task.status       IS 'TODO 待办 / IN_PROGRESS 进行中 / DONE 已完成';
COMMENT ON COLUMN task.priority     IS 'LOW 低 / MEDIUM 中 / HIGH 高 / URGENT 紧急';
COMMENT ON COLUMN task.due_date     IS '截止时间，可为空';
COMMENT ON COLUMN task.completed_at IS '完成时间；非 DONE 状态时为空';
COMMENT ON COLUMN task.deleted_at   IS '软删除时间，非空表示在回收站中（满 90 天后由定时任务清理）';
COMMENT ON COLUMN task.recorded_at  IS '记录时间：创建时自动写入，编辑时可由用户刷新为当前时间';

-- 索引：任务列表按状态筛选、各状态计数统计
CREATE INDEX idx_task_user_deleted_status   ON task (user_id, deleted_at, status);
-- 索引：按截止时间排序、逾期与今日到期统计
CREATE INDEX idx_task_user_deleted_due      ON task (user_id, deleted_at, due_date);
-- 索引：主页瀑布流的默认排序（记录时间倒序，编辑时刷新 recorded_at 即置顶）
CREATE INDEX idx_task_user_deleted_recorded ON task (user_id, deleted_at, recorded_at DESC);
-- 索引：回收站列表。部分索引，只索引已删除的行，体积小且回收站查询必然命中
CREATE INDEX idx_task_trash                 ON task (user_id, deleted_at) WHERE deleted_at IS NOT NULL;


-- ============================================================================
-- 表 3/5：user_avatar —— 用户头像
-- 一个用户最多一行（user_id 唯一）。实际文件存在 MinIO，这里只记录元数据。
-- 没有临时状态：上传即绑定；换头像 = 同一事务内删旧行 + 插新行（只增不更新，故无 updated_at）。
-- ============================================================================
CREATE TABLE user_avatar
(
    id            UUID         PRIMARY KEY DEFAULT uuidv7(),   -- 主键，UUID v7（时间有序）
    user_id       UUID         NOT NULL,                       -- 归属用户，一个用户一行（无外键，应用层保证）
    object_key    VARCHAR(512) NOT NULL,                       -- MinIO 对象键，不含域名
    bucket        VARCHAR(64)  NOT NULL,                       -- 所在存储桶名
    original_name VARCHAR(255),                                -- 原始文件名，仅用于界面展示
    content_type  VARCHAR(128),                                -- MIME 类型，用于响应头与预览
    created_at    TIMESTAMP    NOT NULL DEFAULT now(),         -- 上传时间（本表无更新场景）
    -- 一个用户只能有一张头像；对象键全局唯一
    CONSTRAINT uk_user_avatar_user_id    UNIQUE (user_id),
    CONSTRAINT uk_user_avatar_object_key UNIQUE (object_key)
);

COMMENT ON TABLE  user_avatar               IS '用户头像（一用户一行）；只增不更新';
COMMENT ON COLUMN user_avatar.id            IS '主键，UUID v7（时间有序）';
COMMENT ON COLUMN user_avatar.user_id       IS '归属用户，一个用户一行（无外键，应用层保证）';
COMMENT ON COLUMN user_avatar.object_key    IS 'MinIO 对象键，不含域名，全局唯一';
COMMENT ON COLUMN user_avatar.bucket        IS '所在存储桶名';
COMMENT ON COLUMN user_avatar.original_name IS '原始文件名，仅用于界面展示';
COMMENT ON COLUMN user_avatar.content_type  IS 'MIME 类型';
COMMENT ON COLUMN user_avatar.created_at    IS '上传时间（换头像 = 删旧行 + 插新行，故不设 updated_at）';

-- 不另建索引：uk_user_avatar_user_id 已提供「按用户查头像」所需的索引


-- ============================================================================
-- 表 4/5：task_image —— 任务配图
-- 一个任务最多 9 张（应用层限制）。实际文件存在 MinIO，这里只记录元数据。
-- 图片随任务保存时一起提交，记录落库时 task_id 已经确定：因此**没有临时状态、也没有 status 列**。
-- 展示顺序由 sort_order 决定（小的排前面，从 1 开始）。保存任务时按前端提交的最终顺序
-- 统一重编为 1..N（拖拽排序就靠这一步）——这是本表唯一会被 UPDATE 的列。
-- 重排会改动多行的 sort_order，因此 uk_task_image_task_sort 声明为 DEFERRABLE INITIALLY DEFERRED：
-- 冲突推迟到事务提交时才检查，否则「[A,B] 换成 [B,A]」这种交换会在逐行 UPDATE 时中途撞车。
-- 任务软删除时记录保留（恢复后仍可见）；任务彻底删除时先删 MinIO 对象再删这里的记录。
-- ============================================================================
CREATE TABLE task_image
(
    id            UUID         PRIMARY KEY DEFAULT uuidv7(),   -- 主键，UUID v7（时间有序）
    user_id       UUID         NOT NULL,                       -- 上传者（无外键，应用层保证）
    task_id       UUID         NOT NULL,                       -- 归属任务，落库时必然已确定（无外键，应用层保证）
    sort_order    SMALLINT     NOT NULL,                       -- 展示序号，同一任务内唯一，从 1 开始
    object_key    VARCHAR(512) NOT NULL,                       -- MinIO 对象键，不含域名
    bucket        VARCHAR(64)  NOT NULL,                       -- 所在存储桶名
    original_name VARCHAR(255),                                -- 原始文件名，仅用于界面展示
    content_type  VARCHAR(128),                                -- MIME 类型，用于响应头与预览
    created_at    TIMESTAMP    NOT NULL DEFAULT now(),         -- 上传时间（仅 sort_order 会被重排，故不设 updated_at）
    -- 对象键全局唯一，避免不同用户上传同名文件时互相覆盖
    CONSTRAINT uk_task_image_object_key UNIQUE (object_key),
    -- 同一任务内序号唯一；顺带提供「按任务取配图、按序号排序」所需的索引。
    -- DEFERRABLE INITIALLY DEFERRED：重排序号时逐行 UPDATE 会短暂撞车，推迟到提交时再校验
    CONSTRAINT uk_task_image_task_sort  UNIQUE (task_id, sort_order) DEFERRABLE INITIALLY DEFERRED
    -- 不写 CHECK：序号从 1 起、单任务 ≤9 张，都由后端保证（见文件头约定 6）
);

COMMENT ON TABLE  task_image               IS '任务配图元数据（一个任务最多 9 张）；只增不更新（sort_order 除外）';
COMMENT ON COLUMN task_image.id            IS '主键，UUID v7（时间有序）';
COMMENT ON COLUMN task_image.user_id       IS '上传者（无外键，应用层保证）';
COMMENT ON COLUMN task_image.task_id       IS '归属任务，落库时必然已确定（无外键，应用层保证）';
COMMENT ON COLUMN task_image.sort_order    IS '展示序号，同一任务内唯一，从 1 开始；小的排前面，保存任务时按提交顺序统一重编为 1..N';
COMMENT ON COLUMN task_image.object_key    IS 'MinIO 对象键，不含域名，全局唯一';
COMMENT ON COLUMN task_image.bucket        IS '所在存储桶名';
COMMENT ON COLUMN task_image.original_name IS '原始文件名，仅用于界面展示，不参与对象键拼接';
COMMENT ON COLUMN task_image.content_type  IS 'MIME 类型';
COMMENT ON COLUMN task_image.created_at    IS '上传时间（仅 sort_order 会被重排，故不设 updated_at）';

-- 索引：按用户统计图片总数（保存带图的任务时要校验单用户 5000 张上限，属高频路径）
CREATE INDEX idx_task_image_user ON task_image (user_id);

-- 不另建索引：uk_task_image_task_sort 已提供「按任务批量回填配图并按序号排序」所需的索引


-- ============================================================================
-- 表 5/5：admin_user —— 管理员
-- 与 app_user **完全独立**：管理员不是「用户的一种」，不能用管理员账号写任务，也不能用用户账号进后台。
-- 没有自助注册：首个（超级）管理员由应用启动时按配置引导创建，见《系统设计说明书》7.11 与 11.3。
-- 管理员对用户的操作（冻结 / 解冻 / 注销 / 改资料 / 重置密码）只写 app_user，不改本表。
-- 一期不做管理员管理界面（改密请手工改库或后续再补），见系统说明书 1.2「不做」。
-- name 与用户表的 name 用法不同：管理员的 name **同时是登录名**，因此必须唯一（管理员没有邮箱登录通道）。
-- ============================================================================
CREATE TABLE admin_user
(
    id                  UUID         PRIMARY KEY DEFAULT uuidv7(),   -- 主键，UUID v7（时间有序）
    name                VARCHAR(64)  NOT NULL,                       -- 登录名兼显示名，全局唯一
    password            VARCHAR(128) NOT NULL,                       -- 密码，BCrypt 密文
    last_login_at       TIMESTAMP,                                   -- 上次登录时间，登录成功时写入；从未登录为空
    password_updated_at TIMESTAMP    NOT NULL DEFAULT now(),         -- 密码最后修改时间；签发早于此值的 token 直接失效
    created_at          TIMESTAMP    NOT NULL DEFAULT now(),         -- 创建时间
    updated_at          TIMESTAMP    NOT NULL DEFAULT now(),         -- 更新时间
    CONSTRAINT uk_admin_user_name UNIQUE (name)
);

COMMENT ON TABLE  admin_user                     IS '管理员（与用户表完全独立，无任何外键关联）';
COMMENT ON COLUMN admin_user.id                  IS '主键，UUID v7（时间有序）';
COMMENT ON COLUMN admin_user.name                IS '登录名兼显示名，全局唯一';
COMMENT ON COLUMN admin_user.password            IS 'BCrypt 密文';
COMMENT ON COLUMN admin_user.last_login_at       IS '上次登录时间，登录成功时写入；从未登录为空';
COMMENT ON COLUMN admin_user.password_updated_at IS '密码最后修改时间；签发时间早于此值的 token 视为失效';
COMMENT ON COLUMN admin_user.created_at          IS '创建时间';
COMMENT ON COLUMN admin_user.updated_at          IS '更新时间';

-- 不另建索引：uk_admin_user_name 已提供「按登录名查管理员」所需的索引


-- ============================================================================
-- 验证码不在本库
-- 图形验证码与邮箱验证码都存 Redis（原生 TTL + Lua 原子消费），因此没有 email_code 表，
-- 也没有对应的索引、枚举与清理规则。key 设计与降级策略见《系统设计说明书》7.5。
-- ============================================================================


-- ============================================================================
-- 脚本结束：5 张表 + 44 个字段注释 + 7 个索引 + 5 个唯一约束（各自自带索引），**0 个 CHECK**。
-- 用法：全新安装整份执行；已有库升级时手工执行 ALTER，再把改动改写回上面的
--       CREATE TABLE 定义，保持「本文件 = 当前表结构」。
-- 执行命令与变更流程见《数据库设计说明书》第 9 章（引用不带版本号，文档进位时无需同步本行）。
-- ============================================================================
