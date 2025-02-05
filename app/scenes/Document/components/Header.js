// @flow
import * as React from 'react';
import { throttle } from 'lodash';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { Redirect } from 'react-router-dom';
import styled from 'styled-components';
import breakpoint from 'styled-components-breakpoint';
import { EditIcon, PlusIcon } from 'outline-icons';
import { transparentize, darken } from 'polished';
import Document from 'models/Document';
import AuthStore from 'stores/AuthStore';
import { documentEditUrl } from 'utils/routeHelpers';
import { meta } from 'utils/keyboard';

import Flex from 'shared/components/Flex';
import Breadcrumb from 'shared/components/Breadcrumb';
import DocumentMenu from 'menus/DocumentMenu';
import NewChildDocumentMenu from 'menus/NewChildDocumentMenu';
import DocumentShare from 'scenes/DocumentShare';
import Button from 'components/Button';
import Tooltip from 'components/Tooltip';
import Modal from 'components/Modal';
import Fade from 'components/Fade';
import Badge from 'components/Badge';
import Collaborators from 'components/Collaborators';
import { Action, Separator } from 'components/Actions';
import PoliciesStore from 'stores/PoliciesStore';

type Props = {
  policies: PoliciesStore,
  document: Document,
  isDraft: boolean,
  isEditing: boolean,
  isRevision: boolean,
  isSaving: boolean,
  isPublishing: boolean,
  publishingIsDisabled: boolean,
  savingIsDisabled: boolean,
  onDiscard: () => void,
  onSave: ({
    done?: boolean,
    publish?: boolean,
    autosave?: boolean,
  }) => void,
  auth: AuthStore,
};

@observer
class Header extends React.Component<Props> {
  @observable isScrolled = false;
  @observable showShareModal = false;
  @observable redirectTo: ?string;

  componentDidMount() {
    window.addEventListener('scroll', this.handleScroll);
  }

  componentWillUnmount() {
    window.removeEventListener('scroll', this.handleScroll);
  }

  updateIsScrolled = () => {
    this.isScrolled = window.scrollY > 75;
  };

  handleScroll = throttle(this.updateIsScrolled, 50);

  handleEdit = () => {
    this.redirectTo = documentEditUrl(this.props.document);
  };

  handleSave = () => {
    this.props.onSave({ done: true });
  };

  handlePublish = () => {
    this.props.onSave({ done: true, publish: true });
  };

  handleShareLink = async (ev: SyntheticEvent<>) => {
    const { document } = this.props;
    if (!document.shareUrl) await document.share();
    this.showShareModal = true;
  };

  handleCloseShareModal = () => {
    this.showShareModal = false;
  };

  handleClickTitle = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  render() {
    if (this.redirectTo) return <Redirect to={this.redirectTo} push />;

    const {
      document,
      policies,
      isEditing,
      isDraft,
      isPublishing,
      isRevision,
      isSaving,
      savingIsDisabled,
      publishingIsDisabled,
      auth,
    } = this.props;

    const can = policies.abilities(document.id);
    const canShareDocuments = auth.team && auth.team.sharing && can.share;
    const canToggleEmbeds = auth.team && auth.team.documentEmbeds;
    const canEdit = can.update && !isEditing;

    return (
      <Actions
        align="center"
        justify="space-between"
        readOnly={!isEditing}
        isCompact={this.isScrolled}
        shrink={false}
      >
        <Modal
          isOpen={this.showShareModal}
          onRequestClose={this.handleCloseShareModal}
          title="Share document"
        >
          <DocumentShare
            document={document}
            onSubmit={this.handleCloseShareModal}
          />
        </Modal>
        <Breadcrumb document={document} />
        {this.isScrolled && (
          <Title onClick={this.handleClickTitle}>
            <Fade>
              {document.title} {document.isArchived && <Badge>Archived</Badge>}
            </Fade>
          </Title>
        )}
        <Wrapper align="center" justify="flex-end">
          {!isDraft && !isEditing && <Collaborators document={document} />}
          {isSaving &&
            !isPublishing && (
              <Action>
                <Status>Saving…</Status>
              </Action>
            )}
          {!isDraft &&
            !isEditing &&
            canShareDocuments && (
              <Action>
                <Button
                  onClick={this.handleShareLink}
                  title="Share document"
                  neutral
                  small
                >
                  Share
                </Button>
              </Action>
            )}
          {isEditing && (
            <React.Fragment>
              <Action>
                <Tooltip
                  tooltip="Save"
                  shortcut={`${meta}+enter`}
                  delay={500}
                  placement="bottom"
                >
                  <Button
                    onClick={this.handleSave}
                    disabled={savingIsDisabled}
                    isSaving={isSaving}
                    neutral={isDraft}
                    small
                  >
                    {isDraft ? 'Save Draft' : 'Done Editing'}
                  </Button>
                </Tooltip>
              </Action>
            </React.Fragment>
          )}
          {can.update &&
            isDraft && (
              <Action>
                <Button
                  onClick={this.handlePublish}
                  title="Publish document"
                  disabled={publishingIsDisabled}
                  small
                >
                  {isPublishing ? 'Publishing…' : 'Publish'}
                </Button>
              </Action>
            )}
          {canEdit && (
            <Action>
              <Tooltip
                tooltip="Edit document"
                shortcut="e"
                delay={500}
                placement="bottom"
              >
                <Button
                  icon={<EditIcon />}
                  onClick={this.handleEdit}
                  neutral
                  small
                >
                  Edit
                </Button>
              </Tooltip>
            </Action>
          )}
          {canEdit &&
            !isDraft && (
              <Action>
                <NewChildDocumentMenu
                  document={document}
                  label={
                    <Tooltip
                      tooltip="New document"
                      shortcut="n"
                      delay={500}
                      placement="bottom"
                    >
                      <Button icon={<PlusIcon />} neutral>
                        New doc
                      </Button>
                    </Tooltip>
                  }
                />
              </Action>
            )}

          {!isEditing && (
            <React.Fragment>
              <Separator />
              <Action>
                <DocumentMenu
                  document={document}
                  isRevision={isRevision}
                  showToggleEmbeds={canToggleEmbeds}
                  showPrint
                />
              </Action>
            </React.Fragment>
          )}
        </Wrapper>
      </Actions>
    );
  }
}

const Status = styled.div`
  color: ${props => props.theme.slate};
`;

const Wrapper = styled(Flex)`
  width: 100%;
  align-self: flex-end;
  height: 32px;

  ${breakpoint('tablet')`	
    width: 33.3%;
  `};
`;

const Actions = styled(Flex)`
  position: sticky;
  top: 0;
  right: 0;
  left: 0;
  z-index: 1;
  background: ${props => transparentize(0.1, props.theme.background)};
  border-bottom: 1px solid
    ${props =>
      props.isCompact
        ? darken(0.05, props.theme.sidebarBackground)
        : 'transparent'};
  padding: 12px;
  transition: all 100ms ease-out;
  transform: translate3d(0, 0, 0);
  -webkit-backdrop-filter: blur(20px);

  @media print {
    display: none;
  }

  ${breakpoint('tablet')`
    padding: ${props => (props.isCompact ? '12px' : `24px 24px 0`)};
  `};
`;

const Title = styled.div`
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  align-items: center;
  justify-content: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  display: none;
  width: 0;

  ${breakpoint('tablet')`	
    display: flex;
    flex-grow: 1;
  `};
`;

export default inject('auth', 'policies')(Header);
