const { UserService } = require('../src/userService');

/**
 * Suíte refatorada do UserService.
 *
 * Princípios aplicados:
 *  - Padrão AAA (Arrange, Act, Assert) em todos os testes;
 *  - Um comportamento por teste (sem Eager Test);
 *  - Nenhuma lógica condicional (if/for/try-catch) dentro dos testes;
 *  - Asserções sobre comportamento observável, não sobre formatação exata;
 *  - Dados de teste visíveis dentro de cada teste (sem "Convidado Misterioso");
 *  - Nomes descritivos no formato "deve <resultado> quando <condição>".
 */

// Builder: preenche só o que é irrelevante para o teste. Os valores que
// importam para o cenário são sempre passados explicitamente em cada teste.
const criarUsuario = (service, overrides = {}) => {
  const dados = {
    nome: 'Fulano de Tal',
    email: 'fulano@teste.com',
    idade: 25,
    isAdmin: false,
    ...overrides,
  };
  return service.createUser(dados.nome, dados.email, dados.idade, dados.isAdmin);
};

describe('UserService', () => {
  let userService;

  beforeEach(() => {
    userService = new UserService();
    userService._clearDB(); // garante isolamento: o "banco" é compartilhado no módulo
  });

  describe('createUser', () => {
    it('deve retornar o usuário criado com os dados informados', () => {
      // Arrange
      const nome = 'Alice';
      const email = 'alice@email.com';
      const idade = 28;

      // Act
      const usuario = userService.createUser(nome, email, idade);

      // Assert
      expect(usuario).toMatchObject({ nome, email, idade });
    });

    it('deve gerar um id para o novo usuário', () => {
      // Arrange & Act
      const usuario = criarUsuario(userService);

      // Assert
      expect(usuario.id).toEqual(expect.any(String));
      expect(usuario.id).not.toHaveLength(0);
    });

    it('deve gerar ids diferentes para usuários diferentes', () => {
      // Arrange & Act
      const primeiro = criarUsuario(userService, { email: 'um@teste.com' });
      const segundo = criarUsuario(userService, { email: 'dois@teste.com' });

      // Assert
      expect(primeiro.id).not.toBe(segundo.id);
    });

    it('deve criar o usuário com status "ativo"', () => {
      // Arrange & Act
      const usuario = criarUsuario(userService);

      // Assert
      expect(usuario.status).toBe('ativo');
    });

    it('deve criar o usuário como não administrador quando isAdmin não é informado', () => {
      // Arrange & Act
      const usuario = userService.createUser('Comum', 'comum@teste.com', 30);

      // Assert
      expect(usuario.isAdmin).toBe(false);
    });

    it('deve criar um administrador quando isAdmin é true', () => {
      // Arrange & Act
      const usuario = userService.createUser('Admin', 'admin@teste.com', 40, true);

      // Assert
      expect(usuario.isAdmin).toBe(true);
    });

    it('deve registrar a data de criação do usuário', () => {
      // Arrange & Act
      const usuario = criarUsuario(userService);

      // Assert
      expect(usuario.createdAt).toBeInstanceOf(Date);
    });

    it('deve aceitar usuário com exatamente 18 anos', () => {
      // Arrange
      const idadeLimite = 18;

      // Act
      const usuario = criarUsuario(userService, { idade: idadeLimite });

      // Assert
      expect(usuario.idade).toBe(idadeLimite);
    });

    it('deve lançar erro quando o usuário é menor de idade', () => {
      // Arrange
      const idadeMenor = 17;

      // Act
      const criarMenorDeIdade = () =>
        userService.createUser('Menor', 'menor@email.com', idadeMenor);

      // Assert
      expect(criarMenorDeIdade).toThrow('O usuário deve ser maior de idade.');
    });

    it('não deve armazenar o usuário quando ele é menor de idade', () => {
      // Arrange
      const criarMenorDeIdade = () =>
        userService.createUser('Menor', 'menor@email.com', 17);

      // Act (a falha é esperada; o expect apenas a captura para o teste seguir)
      expect(criarMenorDeIdade).toThrow();

      // Assert
      expect(userService.generateUserReport()).toContain('Nenhum usuário cadastrado');
    });

    it.each([
      ['nome', [undefined, 'fulano@teste.com', 25]],
      ['email', ['Fulano', undefined, 25]],
      ['idade', ['Fulano', 'fulano@teste.com', undefined]],
    ])('deve lançar erro quando o campo %s está ausente', (_campo, argumentos) => {
      // Arrange
      const criarSemCampoObrigatorio = () => userService.createUser(...argumentos);

      // Act & Assert
      expect(criarSemCampoObrigatorio).toThrow('Nome, email e idade são obrigatórios.');
    });
  });

  describe('getUserById', () => {
    it('deve retornar o usuário correspondente quando o id existe', () => {
      // Arrange
      const usuarioCriado = criarUsuario(userService, { nome: 'Beatriz' });

      // Act
      const usuarioBuscado = userService.getUserById(usuarioCriado.id);

      // Assert
      expect(usuarioBuscado).toEqual(usuarioCriado);
    });

    it('deve retornar null quando o id não existe', () => {
      // Arrange
      const idInexistente = 'id-que-nao-existe';

      // Act
      const resultado = userService.getUserById(idInexistente);

      // Assert
      expect(resultado).toBeNull();
    });
  });

  describe('deactivateUser', () => {
    it('deve retornar true ao desativar um usuário comum', () => {
      // Arrange
      const usuarioComum = criarUsuario(userService, { isAdmin: false });

      // Act
      const resultado = userService.deactivateUser(usuarioComum.id);

      // Assert
      expect(resultado).toBe(true);
    });

    it('deve alterar o status do usuário comum para "inativo" após desativá-lo', () => {
      // Arrange
      const usuarioComum = criarUsuario(userService, { isAdmin: false });

      // Act
      userService.deactivateUser(usuarioComum.id);

      // Assert
      expect(userService.getUserById(usuarioComum.id).status).toBe('inativo');
    });

    it('deve retornar false ao tentar desativar um administrador', () => {
      // Arrange
      const usuarioAdmin = criarUsuario(userService, { isAdmin: true });

      // Act
      const resultado = userService.deactivateUser(usuarioAdmin.id);

      // Assert
      expect(resultado).toBe(false);
    });

    it('deve manter o administrador "ativo" após tentativa de desativação', () => {
      // Arrange
      const usuarioAdmin = criarUsuario(userService, { isAdmin: true });

      // Act
      userService.deactivateUser(usuarioAdmin.id);

      // Assert
      expect(userService.getUserById(usuarioAdmin.id).status).toBe('ativo');
    });

    it('deve retornar false quando o usuário não existe', () => {
      // Arrange
      const idInexistente = 'id-que-nao-existe';

      // Act
      const resultado = userService.deactivateUser(idInexistente);

      // Assert
      expect(resultado).toBe(false);
    });
  });

  describe('generateUserReport', () => {
    it('deve informar que não há usuários quando nenhum foi cadastrado', () => {
      // Arrange (nenhum usuário criado: o banco foi limpo no beforeEach)

      // Act
      const relatorio = userService.generateUserReport();

      // Assert
      expect(relatorio).toContain('Nenhum usuário cadastrado');
    });

    it('deve incluir um título identificando o relatório', () => {
      // Arrange
      criarUsuario(userService);

      // Act
      const relatorio = userService.generateUserReport();

      // Assert
      expect(relatorio).toMatch(/Relatório de Usuários/);
    });

    it('deve incluir o id e o nome de cada usuário cadastrado', () => {
      // Arrange
      const alice = criarUsuario(userService, { nome: 'Alice', email: 'alice@email.com' });
      const bob = criarUsuario(userService, { nome: 'Bob', email: 'bob@email.com' });

      // Act
      const relatorio = userService.generateUserReport();

      // Assert
      expect(relatorio).toContain(alice.id);
      expect(relatorio).toContain('Alice');
      expect(relatorio).toContain(bob.id);
      expect(relatorio).toContain('Bob');
    });

    it('deve refletir o status "inativo" de um usuário desativado', () => {
      // Arrange
      const usuario = criarUsuario(userService, { nome: 'Carlos' });
      userService.deactivateUser(usuario.id);

      // Act
      const relatorio = userService.generateUserReport();

      // Assert
      expect(relatorio).toContain('inativo');
    });

    it('não deve exibir a mensagem de "nenhum usuário" quando há usuários cadastrados', () => {
      // Arrange
      criarUsuario(userService);

      // Act
      const relatorio = userService.generateUserReport();

      // Assert
      expect(relatorio).not.toContain('Nenhum usuário cadastrado');
    });
  });
});
