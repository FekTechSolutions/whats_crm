/* Execute this script on SQL Server after creating the CrmWhatsapp database. */
CREATE TABLE dbo.Departments (
  Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
  Name NVARCHAR(120) NOT NULL UNIQUE,
  Description NVARCHAR(500) NULL,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE dbo.Users (
  Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
  FullName NVARCHAR(160) NOT NULL,
  Email NVARCHAR(255) NOT NULL UNIQUE,
  PasswordHash NVARCHAR(255) NOT NULL,
  Phone VARCHAR(32) NULL,
  AvatarUrl NVARCHAR(1000) NULL,
  DepartmentId UNIQUEIDENTIFIER NULL REFERENCES dbo.Departments(Id) ON DELETE SET NULL,
  Role VARCHAR(20) NOT NULL CONSTRAINT CK_Users_Role CHECK (Role IN ('admin', 'supervisor', 'atendente')),
  IsActive BIT NOT NULL DEFAULT 1,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE dbo.Customers (
  Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
  Name NVARCHAR(160) NOT NULL,
  Company NVARCHAR(160) NULL,
  WhatsApp VARCHAR(32) NOT NULL,
  Email NVARCHAR(255) NULL,
  Document VARCHAR(32) NULL,
  Notes NVARCHAR(MAX) NULL,
  Status VARCHAR(20) NOT NULL DEFAULT 'lead' CONSTRAINT CK_Customers_Status CHECK (Status IN ('ativo', 'inativo', 'lead', 'bloqueado')),
  OwnerId UNIQUEIDENTIFIER NULL REFERENCES dbo.Users(Id) ON DELETE SET NULL,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_Customers_WhatsApp UNIQUE (WhatsApp)
);

CREATE TABLE dbo.CustomerTags (
  CustomerId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Customers(Id) ON DELETE CASCADE,
  Tag NVARCHAR(80) NOT NULL,
  CONSTRAINT PK_CustomerTags PRIMARY KEY (CustomerId, Tag)
);

CREATE TABLE dbo.Conversations (
  Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
  CustomerId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Customers(Id),
  AssigneeId UNIQUEIDENTIFIER NULL REFERENCES dbo.Users(Id) ON DELETE SET NULL,
  DepartmentId UNIQUEIDENTIFIER NULL REFERENCES dbo.Departments(Id) ON DELETE SET NULL,
  Status VARCHAR(24) NOT NULL DEFAULT 'novo' CONSTRAINT CK_Conversations_Status CHECK (Status IN ('novo', 'em_atendimento', 'aguardando_cliente', 'finalizado')),
  UnreadCount INT NOT NULL DEFAULT 0,
  LastMessageAt DATETIME2 NULL,
  LastMessagePreview NVARCHAR(1000) NULL,
  FirstResponseSeconds INT NULL,
  ClosedAt DATETIME2 NULL,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_Conversations_Customer_Status ON dbo.Conversations(CustomerId, Status, UpdatedAt DESC);

CREATE TABLE dbo.Messages (
  Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
  ConversationId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Conversations(Id) ON DELETE CASCADE,
  SenderId UNIQUEIDENTIFIER NULL REFERENCES dbo.Users(Id) ON DELETE SET NULL,
  Direction VARCHAR(10) NOT NULL CONSTRAINT CK_Messages_Direction CHECK (Direction IN ('entrada', 'saida')),
  Type VARCHAR(20) NOT NULL DEFAULT 'texto' CONSTRAINT CK_Messages_Type CHECK (Type IN ('texto', 'imagem', 'documento', 'audio', 'video', 'localizacao')),
  Content NVARCHAR(MAX) NULL,
  MediaUrl NVARCHAR(2000) NULL,
  MediaMime VARCHAR(100) NULL,
  WhatsAppMessageId VARCHAR(128) NULL,
  Status VARCHAR(30) NOT NULL DEFAULT 'sent',
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_Messages_WhatsAppMessageId UNIQUE (WhatsAppMessageId)
);
CREATE INDEX IX_Messages_Conversation_CreatedAt ON dbo.Messages(ConversationId, CreatedAt);

CREATE TABLE dbo.WebhookEvents (
  Id BIGINT IDENTITY(1,1) PRIMARY KEY,
  EventType VARCHAR(80) NOT NULL,
  Payload NVARCHAR(MAX) NOT NULL,
  ReceivedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

GO
CREATE OR ALTER TRIGGER dbo.TR_Departments_UpdatedAt ON dbo.Departments AFTER UPDATE AS
  UPDATE dbo.Departments SET UpdatedAt = SYSUTCDATETIME() FROM dbo.Departments t INNER JOIN inserted i ON i.Id = t.Id;
GO
CREATE OR ALTER TRIGGER dbo.TR_Users_UpdatedAt ON dbo.Users AFTER UPDATE AS
  UPDATE dbo.Users SET UpdatedAt = SYSUTCDATETIME() FROM dbo.Users t INNER JOIN inserted i ON i.Id = t.Id;
GO
CREATE OR ALTER TRIGGER dbo.TR_Customers_UpdatedAt ON dbo.Customers AFTER UPDATE AS
  UPDATE dbo.Customers SET UpdatedAt = SYSUTCDATETIME() FROM dbo.Customers t INNER JOIN inserted i ON i.Id = t.Id;
GO
CREATE OR ALTER TRIGGER dbo.TR_Conversations_UpdatedAt ON dbo.Conversations AFTER UPDATE AS
  UPDATE dbo.Conversations SET UpdatedAt = SYSUTCDATETIME() FROM dbo.Conversations t INNER JOIN inserted i ON i.Id = t.Id;
GO

INSERT INTO dbo.Departments (Name, Description) VALUES
  (N'Comercial', N'Equipe de vendas e prospecção'),
  (N'Suporte', N'Atendimento e suporte técnico'),
  (N'Financeiro', N'Cobrança e faturamento');
